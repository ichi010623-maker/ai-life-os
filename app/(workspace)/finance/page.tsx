import {
  FinanceBudgetWidget,
} from '@/components/finance/FinanceBudgetWidget';
import {
  FinanceRecordTable,
} from '@/components/finance/FinanceRecordTable';
import {
  getFinanceRecords,
  getFinanceSummary,
} from '@/actions/finance';
import { FinancePageSkeleton } from '@/components/finance/FinancePageSkeleton';
import { Suspense } from 'react';

// 始终走实时渲染，保证资金流变化立即可见
export const dynamic = 'force-dynamic';

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Finance Hub</h1>
          <span className="text-xs text-muted-foreground">
            资金流概览 · 月度预算 · 流水明细
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          实时汇总当月收支、分配桶支出占比，并支持自定义预警阈值
        </p>
      </header>

      <Suspense fallback={<FinancePageSkeleton />}>
        <FinanceDashboard />
      </Suspense>
    </div>
  );
}

// ============================================================
// 内部异步组件：聚合两个 server action 的数据
// ============================================================

async function FinanceDashboard() {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM

  // 并行获取概要 + 流水（最近优先）
  const [summary, recordsPage] = await Promise.all([
    getFinanceSummary(month),
    getFinanceRecords({ limit: 200 }),
  ]);

  return (
    <>
      <FinanceBudgetWidget summary={summary} />
      <FinanceRecordTable
        initialRecords={recordsPage.records}
        total={recordsPage.total}
      />
    </>
  );
}
