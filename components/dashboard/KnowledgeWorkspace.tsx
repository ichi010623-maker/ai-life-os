'use client';

import * as React from 'react';
import {
  BookOpen,
  ExternalLink,
  Hash,
  Loader2,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createKnowledgeNote,
  deleteKnowledgeNote,
} from '@/actions/knowledge';
import { cn } from '@/lib/utils';
import type {
  KnowledgeNote,
  KnowledgeCategory,
} from '@/types';

// ============================================================
// Constants
// ============================================================

const CATEGORIES: Array<{
  value: KnowledgeCategory;
  label: string;
  emoji: string;
  color: string;
}> = [
  { value: 'ARTICLE',  label: '文章',  emoji: '📄', color: 'bg-sky-500/10 text-sky-700 border-sky-500/30' },
  { value: 'BOOK',     label: '书籍',  emoji: '📚', color: 'bg-violet-500/10 text-violet-700 border-violet-500/30' },
  { value: 'RESEARCH', label: '研究',  emoji: '🔬', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  { value: 'MEETING',  label: '会议',  emoji: '🤝', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
];

const CATEGORY_LABEL: Record<KnowledgeCategory, string> = {
  ARTICLE: '文章',
  BOOK: '书籍',
  RESEARCH: '研究',
  MEETING: '会议',
};

// ============================================================
// Main Component
// ============================================================

interface Props {
  initialNotes: KnowledgeNote[];
}

export function KnowledgeWorkspace({ initialNotes }: Props) {
  const [notes, setNotes] = React.useState(initialNotes);
  const [search, setSearch] = React.useState('');
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [, startTransition] = React.useTransition();

  // 同步服务端数据
  React.useEffect(() => setNotes(initialNotes), [initialNotes]);

  // 全部标签（去重 + 排序）
  const allTags = React.useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) for (const t of n.tags) set.add(t);
    return Array.from(set).sort();
  }, [notes]);

  // 过滤
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (selectedTag && !n.tags.includes(selectedTag)) return false;
      if (q) {
        const inTitle = n.title.toLowerCase().includes(q);
        const inContent = n.content.toLowerCase().includes(q);
        if (!inTitle && !inContent) return false;
      }
      return true;
    });
  }, [notes, selectedTag, search]);

  const handleDelete = (id: string) => {
    if (!window.confirm('确认删除这条笔记？')) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => {
      try {
        await deleteKnowledgeNote(id);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : '删除失败');
      }
    });
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // 简易反馈：1.5s 提示
      const el = document.activeElement as HTMLElement | null;
      if (el) el.blur();
    } catch {
      window.alert('复制失败，请手动选择文本');
    }
  };

  return (
    <div className="space-y-4">
      {/* ===== Toolbar ===== */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标题或内容..."
            className="pl-8 h-9 w-64"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto flex-wrap">
            <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
              <Hash className="h-3 w-3" /> 筛选
            </span>
            {allTags.map((tag) => {
              const active = selectedTag === tag;
              return (
                <Badge
                  key={tag}
                  variant={active ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer text-xs transition-colors',
                    !active && 'hover:bg-muted/40',
                  )}
                  onClick={() => setSelectedTag(active ? null : tag)}
                >
                  #{tag}
                </Badge>
              );
            })}
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                清除
              </button>
            )}
          </div>
        )}

        <Button className="ml-auto" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          新建笔记
        </Button>
      </div>

      {/* ===== Result count ===== */}
      <p className="text-xs text-muted-foreground">
        共 {notes.length} 条 · 显示 {filtered.length} 条
      </p>

      {/* ===== List ===== */}
      {filtered.length === 0 ? (
        notes.length === 0 ? (
          <EmptyHint
            emoji="📚"
            title="知识库空空如也"
            hint="在 QuickCapture 中说「记下来」会自动归档，或者点击右上角新建"
          />
        ) : (
          <EmptyHint
            emoji="🔍"
            title="没有匹配的笔记"
            hint="调整搜索关键词或清除标签筛选"
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onCopy={() => handleCopy(note.content)}
              onDelete={() => handleDelete(note.id)}
            />
          ))}
        </div>
      )}

      {/* ===== Create modal ===== */}
      <CreateNoteModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={(n) => setNotes((prev) => [n, ...prev])}
      />
    </div>
  );
}

// ============================================================
// Note Card
// ============================================================

function NoteCard({
  note,
  onCopy,
  onDelete,
}: {
  note: KnowledgeNote;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const cat = CATEGORIES.find((c) => c.key === note.category)!;
  const excerpt =
    note.content.length > 160
      ? note.content.slice(0, 160) + '...'
      : note.content;

  return (
    <div className="group relative rounded-lg border border-border/60 bg-card p-4 hover:border-sky-500/40 hover:shadow-sm transition-all">
      {/* Top bar */}
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className={cn('text-[10px] px-1.5 h-5', cat.color)}>
          <span className="mr-1">{cat.emoji}</span>
          {cat.label}
        </Badge>
        <span className="text-[10px] text-muted-foreground ml-auto font-mono">
          {formatDate(note.createdAt)}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-medium text-sm mt-2 line-clamp-2 leading-snug">
        {note.title}
      </h3>

      {/* Excerpt */}
      {excerpt && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
          {excerpt}
        </p>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {note.tags.map((t) => (
            <Badge
              key={t}
              variant="outline"
              className="text-[10px] px-1 h-4"
            >
              #{t}
            </Badge>
          ))}
        </div>
      )}

      {/* Source */}
      {note.sourceUrl && (
        <a
          href={note.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          来源
        </a>
      )}

      {/* Hover actions */}
      <div
        className={cn(
          'absolute top-2 right-2 flex items-center gap-0.5 transition-opacity',
          'opacity-0 group-hover:opacity-100',
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground bg-background/80 backdrop-blur"
          onClick={onCopy}
          aria-label="Copy content"
          title="复制内容"
        >
          <span className="text-[10px] font-mono">COPY</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive bg-background/80 backdrop-blur"
          onClick={onDelete}
          aria-label="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Create Modal
// ============================================================

function CreateNoteModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (n: KnowledgeNote) => void;
}) {
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState<KnowledgeCategory>('ARTICLE');
  const [tagsInput, setTagsInput] = React.useState('');
  const [content, setContent] = React.useState('');
  const [sourceUrl, setSourceUrl] = React.useState('');
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setTitle('');
      setCategory('ARTICLE');
      setTagsInput('');
      setContent('');
      setSourceUrl('');
      setError('');
    }
  }, [open]);

  const handleSubmit = () => {
    setError('');
    if (!title.trim()) {
      setError('请填写标题');
      return;
    }

    // 解析 tags：支持中英文逗号 / 空格分隔
    const tags = tagsInput
      .split(/[,，\s]+/)
      .map((t) => t.trim().replace(/^#+/, ''))
      .filter(Boolean);

    startTransition(async () => {
      try {
        const created = await createKnowledgeNote({
          title: title.trim(),
          category,
          tags,
          content: content.trim(),
          sourceUrl: sourceUrl.trim() || undefined,
        });
        onCreated(created);
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : '保存失败');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-sky-500" />
            新建知识笔记
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="note-title">标题</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：《原子习惯》读书笔记"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>分类</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as KnowledgeCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="mr-1.5">{c.emoji}</span>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tags">
                标签
                <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                  （逗号 / 空格分隔）
                </span>
              </Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="例：读书, 习惯养成"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="content">内容（Markdown）</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`# 核心观点\n\n- 第 1 点 ...\n- 第 2 点 ...\n\n> 引用片段 ...`}
              rows={8}
              className="resize-none font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="source" className="text-xs">
              来源 URL（可选）
            </Label>
            <Input
              id="source"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="font-mono text-xs"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !title.trim()}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                保存中
              </>
            ) : (
              '保存'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Empty Hint
// ============================================================

function EmptyHint({
  emoji,
  title,
  hint,
}: {
  emoji: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 p-12 text-center">
      <div className="text-5xl mb-2">{emoji}</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso.slice(0, 10);
  }
}
