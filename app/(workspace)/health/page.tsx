import { Suspense } from 'react';
import { getFoodStock } from '@/actions/pantry';
import { PantryStockGrid } from '@/components/health/PantryStockGrid';
import { AIRecipeGenerator } from '@/components/health/AIRecipeGenerator';
import { HealthPageSkeleton } from '@/components/health/HealthPageSkeleton';

// 始终实时渲染，库存/保质期变更需要立即可见
export const dynamic = 'force-dynamic';

export default function HealthPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Health &amp; Pantry
          </h1>
          <span className="text-xs text-muted-foreground">
            食材库存 · 临期预警 · AI 菜谱
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          自动追踪保质期、库存量，并基于现有食材智能推荐健康菜谱
        </p>
      </header>

      <Suspense fallback={<HealthPageSkeleton />}>
        <HealthDashboard />
      </Suspense>
    </div>
  );
}

// ============================================================
// 内部异步组件
// ============================================================

async function HealthDashboard() {
  const items = await getFoodStock();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左侧：食材冰箱（占 2 列） */}
      <div className="lg:col-span-2">
        <PantryStockGrid initialItems={items} />
      </div>

      {/* 右侧：AI 菜谱生成器（占 1 列） */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-20">
          <AIRecipeGenerator />
        </div>
      </div>
    </div>
  );
}
