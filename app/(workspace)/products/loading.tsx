import { ProductPageSkeleton } from '@/components/products/ProductPageSkeleton';

/** 路由级 Suspense 兜底 */
export default function Loading() {
  return <ProductPageSkeleton />;
}
