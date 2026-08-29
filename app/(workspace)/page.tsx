import { Suspense } from 'react';
import { getDashboardSummary } from '@/actions/dashboard';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

// Dashboard 永远是当前最新状态，禁用静态缓存
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <span className="text-xs text-muted-foreground">
            全局总览 · 任务 / 财务 / 产品 / 健康 / 知识
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          打开 App 第一秒，纵览全局；任意模块异常状态高亮显示
        </p>
      </header>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardAsync />
      </Suspense>
    </div>
  );
}

// ============================================================
// 内部异步组件
// ============================================================

async function DashboardAsync() {
  const summary = await getDashboardSummary();
  return <DashboardGrid summary={summary} />;
}
