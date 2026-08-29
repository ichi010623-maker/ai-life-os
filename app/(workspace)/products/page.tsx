import { Suspense } from 'react';
import { getProductsWithRelations } from '@/actions/products';
import { ProductStageKanban } from '@/components/products/ProductStageKanban';
import { ProductPageSkeleton } from '@/components/products/ProductPageSkeleton';

// 始终走实时渲染，研发阶段变更需要立即可见
export const dynamic = 'force-dynamic';

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Product Workspace
          </h1>
          <span className="text-xs text-muted-foreground">
            灵感库 · 研发看板 · 联动任务与打样支出
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          从 CONCEPT 到 LAUNCHED 的 5 阶段流水线 · 拖拽切换 · 一键统计已发生打样费用
        </p>
      </header>

      <Suspense fallback={<ProductPageSkeleton />}>
        <ProductsDashboard />
      </Suspense>
    </div>
  );
}

// ============================================================
// 内部异步组件：拉取产品及关联数据
// ============================================================

async function ProductsDashboard() {
  const products = await getProductsWithRelations();
  return <ProductStageKanban initialProducts={products} />;
}
