'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight, Link2, Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { createTask, deleteTask, updateTaskStatus } from '@/actions/tasks';
import type {
  Priority,
  RelatedModule,
  TaskLevel,
  TaskStatus,
  TaskTreeNode as TaskTreeNodeData,
} from '@/types';

// ============================================================
// 视觉元数据
// ============================================================

const LEVEL_META: Record<
  TaskLevel,
  { emoji: string; label: string; badge: string; title: string }
> = {
  GOAL: {
    emoji: '👑',
    label: 'GOAL',
    badge: 'bg-violet-500/15 text-violet-700 border-violet-500/40',
    title: 'text-lg font-bold tracking-tight',
  },
  STRATEGIC: {
    emoji: '🎯',
    label: 'STRATEGIC',
    badge: 'bg-sky-500/15 text-sky-700 border-sky-500/40',
    title: 'text-base font-semibold',
  },
  PROJECT: {
    emoji: '🚀',
    label: 'PROJECT',
    badge: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/40',
    title: 'text-sm font-medium',
  },
  TASK: {
    emoji: '📋',
    label: 'TASK',
    badge: 'bg-amber-500/15 text-amber-700 border-amber-500/40',
    title: 'text-sm',
  },
  SUBTASK: {
    emoji: '⚪',
    label: 'SUBTASK',
    badge: 'bg-zinc-500/15 text-zinc-600 border-zinc-500/40',
    title: 'text-xs',
  },
};

const PRIORITY_META: Record<Priority, { label: string; className: string }> = {
  P0: { label: 'P0', className: 'text-red-600 font-bold' },
  P1: { label: 'P1', className: 'text-orange-500 font-semibold' },
  P2: { label: 'P2', className: 'text-zinc-500' },
  P3: { label: 'P3', className: 'text-zinc-400' },
};

/** 当前层级允许的下一层层级（5 层封顶） */
const CHILD_LEVEL: Record<TaskLevel, TaskLevel | null> = {
  GOAL: 'STRATEGIC',
  STRATEGIC: 'PROJECT',
  PROJECT: 'TASK',
  TASK: 'SUBTASK',
  SUBTASK: null,
};

const RELATED_META: Record<RelatedModule, { emoji: string; color: string }> = {
  PRODUCT:  { emoji: '🛠️', color: 'bg-violet-500/10 text-violet-600 border-violet-500/30' },
  KNOWLEDGE:{ emoji: '📚', color: 'bg-pink-500/10   text-pink-600   border-pink-500/30' },
  FINANCE:  { emoji: '💰', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  HEALTH:   { emoji: '🥗', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
};

// ============================================================
// Recursive Component
// ============================================================

interface TaskTreeNodeProps {
  node: TaskTreeNodeData;
  defaultExpanded?: boolean;
}

export function TaskTreeNode({
  node,
  defaultExpanded = true,
}: TaskTreeNodeProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const [showAdd, setShowAdd] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [hovered, setHovered] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const hasChildren = node.children.length > 0;
  const childLevel = CHILD_LEVEL[node.level];
  const meta = LEVEL_META[node.level];
  const pMeta = PRIORITY_META[node.priority];
  const isDone = node.status === 'COMPLETED';
  const isBlocked = node.status === 'BLOCKED';

  const toggleStatus = (checked: boolean) => {
    const next: TaskStatus = checked ? 'COMPLETED' : 'TODO';
    startTransition(async () => {
      await updateTaskStatus(node.id, next);
    });
  };

  const onDelete = () => {
    const ok = window.confirm(
      `确认删除「${node.title}」？\n\n此操作会级联删除所有子任务（${countDescendants(node)} 个）。`,
    );
    if (!ok) return;
    startTransition(async () => {
      await deleteTask(node.id);
    });
  };

  const onAdd = () => {
    const title = newTitle.trim();
    if (!title || !childLevel) return;
    startTransition(async () => {
      await createTask({
        title,
        level: childLevel,
        parentId: node.id,
        priority: 'P2',
        status: 'TODO',
      });
      setNewTitle('');
      setShowAdd(false);
    });
  };

  return (
    <div
      className="group/node"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ===== Row ===== */}
      <div
        className={cn(
          'flex items-start gap-2 py-1.5 px-2 rounded-md transition-colors',
          'hover:bg-muted/60',
          isDone && 'opacity-60',
          isBlocked && 'bg-red-500/5',
          isPending && 'opacity-50',
        )}
      >
        {/* Expand chevron */}
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className={cn(
            'shrink-0 mt-1 h-5 w-5 grid place-items-center rounded',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            !hasChildren && 'invisible',
          )}
          tabIndex={hasChildren ? 0 : -1}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Checkbox */}
        <Checkbox
          checked={isDone}
          onCheckedChange={(v) => toggleStatus(Boolean(v))}
          disabled={isPending}
          className="shrink-0 mt-1.5"
          aria-label="Mark complete"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Level badge */}
            <Badge variant="outline" className={cn('shrink-0 gap-1', meta.badge)}>
              <span aria-hidden>{meta.emoji}</span>
              <span>{meta.label}</span>
            </Badge>

            {/* Priority */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'shrink-0 text-[10px] font-mono px-1 rounded cursor-help',
                    pMeta.className,
                  )}
                >
                  {pMeta.label}
                </span>
              </TooltipTrigger>
              <TooltipContent>优先级 {pMeta.label}</TooltipContent>
            </Tooltip>

            {/* Title */}
            <span
              className={cn(
                'flex-1 min-w-0 truncate',
                meta.title,
                isDone && 'line-through text-muted-foreground',
                isBlocked && !isDone && 'text-red-600',
              )}
            >
              {node.title}
            </span>

            {/* Related module badge */}
            {node.relatedModule && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 gap-1 text-[10px] px-1.5 py-0 h-5',
                      RELATED_META[node.relatedModule].color,
                    )}
                  >
                    <Link2 className="h-2.5 w-2.5" />
                    {node.relatedModule}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  关联到 {node.relatedModule}（{node.relatedId?.slice(0, 8)}…）
                </TooltipContent>
              </Tooltip>
            )}

            {/* Hover actions */}
            <div
              className={cn(
                'flex items-center gap-1 shrink-0 transition-opacity',
                hovered ? 'opacity-100' : 'opacity-0 pointer-events-none',
              )}
            >
              {childLevel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowAdd((p) => !p)}
                  disabled={isPending}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {LEVEL_META[childLevel].label}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={onDelete}
                disabled={isPending}
                aria-label="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {/* Loading spinner overlay */}
            {isPending && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
            )}
          </div>

          {/* Description / due */}
          {(node.description || node.dueDate) && (
            <div className="mt-1 ml-1 space-y-0.5">
              {node.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {node.description}
                </p>
              )}
              {node.dueDate && (
                <p className="text-xs text-muted-foreground">
                  ⏰ Due {formatDate(node.dueDate)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===== Inline add-subtask form ===== */}
      {showAdd && childLevel && (
        <div className="ml-9 mt-1 mb-2 flex items-center gap-2 animate-in fade-in-50 slide-in-from-top-1">
          <span className="text-xs text-muted-foreground shrink-0">
            {LEVEL_META[childLevel].emoji} {LEVEL_META[childLevel].label}
          </span>
          <Input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onAdd();
              if (e.key === 'Escape') {
                setShowAdd(false);
                setNewTitle('');
              }
            }}
            placeholder={`添加${LEVEL_META[childLevel].label}…`}
            className="h-7 text-xs"
          />
          <Button
            size="sm"
            onClick={onAdd}
            disabled={!newTitle.trim() || isPending}
            className="h-7"
          >
            添加
          </Button>
        </div>
      )}

      {/* ===== Children ===== */}
      {expanded && hasChildren && (
        <div className="ml-6 border-l border-border/60 pl-1 mt-0.5">
          {node.children.map((child) => (
            <TaskTreeNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

function countDescendants(node: TaskTreeNodeData): number {
  return node.children.reduce(
    (sum, c) => sum + 1 + countDescendants(c),
    0,
  );
}
