import { FinancePageSkeleton } from '@/components/finance/FinancePageSkeleton';

/**
 * 路由级 Suspense 兜底
 */
export default function Loading() {
  return <FinancePageSkeleton />;
}
