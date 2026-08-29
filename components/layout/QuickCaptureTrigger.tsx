'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuickCapture } from './QuickCaptureModal';

// ============================================================
// 平台检测（用于显示 ⌘ vs Ctrl）
// ============================================================
function usePlatform() {
  const [isMac, setIsMac] = React.useState(false);
  React.useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent));
  }, []);
  return { isMac };
}

// ============================================================
// 公共 kbd badge
// ============================================================
function ShortcutKey({ className }: { className?: string }) {
  const { isMac } = usePlatform();
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex items-center gap-0.5',
        'h-5 px-1.5 rounded border bg-muted/60 text-[10px] font-mono text-muted-foreground',
        'border-border/60',
        className,
      )}
    >
      {isMac ? '⌘' : 'Ctrl'} K
    </kbd>
  );
}

// ============================================================
// 主体组件
// ============================================================

interface QuickCaptureTriggerProps {
  /** 'inline' = 顶栏内的扁平按钮；'fab' = 移动端悬浮按钮 */
  variant?: 'inline' | 'fab';
  className?: string;
}

export function QuickCaptureTrigger({
  variant = 'inline',
  className,
}: QuickCaptureTriggerProps) {
  const { setOpen } = useQuickCapture();

  // ---- FAB（移动端 / 全局悬浮） ----
  if (variant === 'fab') {
    return (
      <button
        type="button"
        aria-label="Quick Capture"
        onClick={() => setOpen(true)}
        className={cn(
          // 位置：底部居中悬浮（iPhone 安全区适配）
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:bottom-8',
          // 形态
          'h-14 px-5 rounded-full shadow-xl shadow-violet-500/25',
          'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white',
          'flex items-center gap-2',
          // 动效
          'hover:scale-105 active:scale-95 transition-transform',
          // 防止被 input 自动 zoom
          'touch-manipulation',
          className,
        )}
      >
        <Sparkles className="h-5 w-5" />
        <span className="text-sm font-medium">Quick Capture</span>
      </button>
    );
  }

  // ---- Inline（Topbar 内） ----
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'group inline-flex items-center gap-2 h-9 px-3 rounded-md',
        'border border-border/60 bg-background/80 hover:bg-muted/60',
        'text-sm text-muted-foreground hover:text-foreground',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40',
        className,
      )}
      aria-label="Open Quick Capture"
    >
      <Sparkles className="h-4 w-4 text-violet-500 group-hover:text-violet-600" />
      <span className="hidden sm:inline">Quick Capture</span>
      <ShortcutKey className="hidden md:inline-flex" />
    </button>
  );
}
