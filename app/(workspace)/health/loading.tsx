import { HealthPageSkeleton } from '@/components/health/HealthPageSkeleton';

/** 路由级 Suspense 兜底 */
export default function Loading() {
  return <HealthPageSkeleton />;
}
