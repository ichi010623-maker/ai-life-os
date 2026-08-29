'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

type CaptureIntent =
  | { targetModule: 'FINANCE'; data: { amount: number; type: 'INCOME' | 'EXPENSE'; category: string; note: string } }
  | { targetModule: 'FOOD_STOCK'; data: { name: string; quantity: number; unit: string; category: string; expirationDate?: string } }
  | { targetModule: 'PRODUCT_IDEA'; data: { title: string; category: string; stage: string; competitorNotes?: string } }
  | { targetModule: 'TASK'; data: { title: string; priority: string; level: string; dueDate?: string } }
  | { targetModule: 'KNOWLEDGE'; data: { title: string; content: string; tags: string[]; category: string } };

type Status = 'idle' | 'loading' | 'success' | 'error';

interface CaptureResult {
  intent: CaptureIntent;
  record: unknown;
}

// ============================================================
// Module Meta（颜色 + 中文标签）
// ============================================================

const MODULE_META: Record<
  CaptureIntent['targetModule'],
  { label: string; emoji: string; badge: string; ring: string }
> = {
  FINANCE:      { label: '财务',  emoji: '💰', badge: 'bg-emerald-500 hover:bg-emerald-500', ring: 'ring-emerald-500/30' },
  FOOD_STOCK:   { label: '食材',  emoji: '🥕', badge: 'bg-orange-500  hover:bg-orange-500',  ring: 'ring-orange-500/30' },
  PRODUCT_IDEA: { label: '产品',  emoji: '💡', badge: 'bg-violet-500  hover:bg-violet-500',  ring: 'ring-violet-500/30' },
  TASK:         { label: '任务',  emoji: '✅', badge: 'bg-sky-500     hover:bg-sky-500',     ring: 'ring-sky-500/30' },
  KNOWLEDGE:    { label: '知识',  emoji: '📚', badge: 'bg-pink-500    hover:bg-pink-500',    ring: 'ring-pink-500/30' },
};

function summarize(intent: CaptureIntent): string {
  switch (intent.targetModule) {
    case 'FINANCE':
      return `${intent.data.type === 'INCOME' ? '收入' : '支出'} ¥${intent.data.amount} · ${intent.data.note}`;
    case 'FOOD_STOCK':
      return `${intent.data.name} ${intent.data.quantity}${intent.data.unit}`;
    case 'PRODUCT_IDEA':
      return intent.data.title;
    case 'TASK':
      return intent.data.title;
    case 'KNOWLEDGE':
      return `${intent.data.title}（${intent.data.tags.slice(0, 3).join(' / ') || '无标签'}）`;
  }
}

// ============================================================
// Context
// ============================================================

interface QuickCaptureContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const QuickCaptureContext = React.createContext<QuickCaptureContextValue | null>(null);

export function useQuickCapture() {
  const ctx = React.useContext(QuickCaptureContext);
  if (!ctx) {
    throw new Error('useQuickCapture must be used within <QuickCaptureProvider>');
  }
  return ctx;
}

// ============================================================
// Provider（包含全局快捷键监听）
// ============================================================

export function QuickCaptureProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 只拦截 Cmd/Ctrl + K
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key.toLowerCase() !== 'k') return;

      // 焦点在输入框/文本域内时不要拦截，否则用户无法在弹窗内输入 "Cmd+K" 字面量
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;

      e.preventDefault();
      setOpen((prev) => !prev);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggle = React.useCallback(() => setOpen((p) => !p), []);

  return (
    <QuickCaptureContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </QuickCaptureContext.Provider>
  );
}

// ============================================================
// Modal
// ============================================================

export function QuickCaptureModal() {
  const { open, setOpen } = useQuickCapture();

  const [input, setInput] = React.useState('');
  const [status, setStatus] = React.useState<Status>('idle');
  const [result, setResult] = React.useState<CaptureResult | null>(null);
  const [errorMsg, setErrorMsg] = React.useState('');

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // 打开时自动聚焦 + 重置状态
  React.useEffect(() => {
    if (open) {
      setStatus('idle');
      setResult(null);
      setErrorMsg('');
      // 50ms 等待 Radix Dialog 完成入场动画再聚焦
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // 关闭时清空输入
  React.useEffect(() => {
    if (!open) {
      setInput('');
    }
  }, [open]);

  const submit = React.useCallback(async () => {
    const value = input.trim();
    if (!value || status === 'loading') return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/quick-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      }
      setResult(data);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '未知错误');
      setStatus('error');
    }
  }, [input, status]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const meta = result ? MODULE_META[result.intent.targetModule] : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className={cn(
          'sm:max-w-[560px] gap-0 p-0 overflow-hidden',
          'rounded-2xl border-border/60 shadow-2xl',
        )}
      >
        <DialogHeader className="px-6 pt-5 pb-3 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="grid place-items-center h-6 w-6 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            Universal Quick-Capture
          </DialogTitle>
          <DialogDescription className="text-xs">
            用自然语言一句话记录到任意模块 · AI 自动分类入库
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入任何灵感、记账、采购或任务...（Shift+Enter 换行）"
            disabled={status === 'loading'}
            rows={3}
            className={cn(
              'resize-none text-sm leading-relaxed',
              'border-border/60 focus-visible:ring-2 focus-visible:ring-violet-500/30',
              'placeholder:text-muted-foreground/70',
            )}
            data-testid="quick-capture-input"
          />

          {/* Status 区 */}
          {status === 'idle' && !result && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Enter</kbd>
              提交
              <span className="mx-1 text-border-3">·</span>
              <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Shift</kbd>
              +
              <kbd className="px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono">Enter</kbd>
              换行
            </p>
          )}

          {status === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
              <span>AI 正在理解并分类数据...</span>
            </div>
          )}

          {status === 'success' && result && meta && (
            <div
              className={cn(
                'rounded-lg border bg-card p-3 flex items-start gap-3',
                'ring-1 animate-in fade-in-50 slide-in-from-bottom-2',
                meta.ring,
              )}
            >
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">成功写入</span>
                  <Badge className={cn('text-white border-0', meta.badge)}>
                    <span className="mr-1">{meta.emoji}</span>
                    {meta.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {summarize(result.intent)}
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-2 text-sm text-destructive animate-in fade-in-50">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="break-all">{errorMsg}</span>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t bg-muted/20">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={status === 'loading'}
          >
            {status === 'success' ? '关闭' : '取消'}
          </Button>
          <Button
            onClick={submit}
            disabled={!input.trim() || status === 'loading'}
            className="bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:opacity-90"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                解析中
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" />
                提交
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
