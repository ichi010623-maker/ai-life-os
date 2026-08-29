import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';

/** 路由级 Suspense 兜底 */
export default function Loading() {
  return <DashboardSkeleton />;
}
