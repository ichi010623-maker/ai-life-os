import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Products Page Skeleton — 在 Suspense fallback 与 loading.tsx 复用。
 */
export function ProductPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border border-border/60 bg-card px-3 py-2 space-y-2">
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            <div className="h-5 w-10 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>

      {/* Toolbar skeleton */}
      <div className="flex gap-2">
        <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
        <div className="ml-auto h-9 w-44 rounded-md bg-muted animate-pulse" />
      </div>

      {/* Kanban skeleton */}
      <div className="flex gap-3 overflow-x-auto pb-3">
        {[0, 1, 2, 3, 4].map((col) => (
          <div
            key={col}
            className="shrink-0 w-72 rounded-lg border border-border/60 bg-muted/20 p-2 space-y-2"
          >
            <div className="h-7 rounded bg-muted/60 animate-pulse" />
            <div className="h-24 rounded bg-card animate-pulse" />
            <div className="h-24 rounded bg-card animate-pulse" />
            <div className="h-16 rounded bg-card animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
