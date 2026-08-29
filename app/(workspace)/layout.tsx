import * as React from 'react';
import {
  QuickCaptureProvider,
  QuickCaptureModal,
} from '@/components/layout/QuickCaptureModal';
import { QuickCaptureTrigger } from '@/components/layout/QuickCaptureTrigger';
import { Sparkles } from 'lucide-react';

/**
 * Workspace Layout
 * ----------------------------------------------------------------------
 * 把 QuickCaptureProvider 放在最外层，使全工作台任意页面都能：
 *   - 按 ⌘/Ctrl + K 唤起 QuickCaptureModal
 *   - 点击 Topbar 内联按钮 或 移动端 FAB 唤起
 *
 * 注：Sidebar / Topbar / 主内容区在本文件中用最小占位实现，
 *     后续可拆为独立 components/layout/{Sidebar,Topbar}.tsx。
 */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QuickCaptureProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        {/* ===== Sidebar（占位） ===== */}
        <aside className="hidden md:flex w-60 shrink-0 border-r border-border/60 bg-muted/30 flex-col">
          <div className="h-14 flex items-center gap-2 px-4 border-b border-border/60">
            <span className="grid place-items-center h-7 w-7 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight">AI Life OS</span>
          </div>
          <nav className="p-3 space-y-1 text-sm">
            {['Dashboard', 'Tasks', 'Products', 'Knowledge', 'Health', 'Finance'].map((label) => (
              <a
                key={label}
                href="#"
                className="block px-3 py-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>
        </aside>

        {/* ===== 右侧主区 ===== */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-3 px-4 md:px-6 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2 md:hidden">
              <span className="grid place-items-center h-7 w-7 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-semibold tracking-tight">AI Life OS</span>
            </div>

            <div className="hidden md:block text-sm text-muted-foreground">
              Workspace
            </div>

            <div className="flex items-center gap-2">
              <QuickCaptureTrigger variant="inline" />
              {/* 头像/菜单占位 */}
              <div className="h-9 w-9 rounded-full bg-muted border border-border/60" />
            </div>
          </header>

          {/* 主内容 */}
          <main className="flex-1 px-4 md:px-8 py-6 pb-28 md:pb-10">
            {children}
          </main>
        </div>

        {/* ===== 移动端 FAB（md 以下显示） ===== */}
        <QuickCaptureTrigger variant="fab" className="md:hidden" />
      </div>

      {/* ===== 全局 Modal：放在最外层避免被父级 overflow / z-index 影响 ===== */}
      <QuickCaptureModal />
    </QuickCaptureProvider>
  );
}
