import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Finance Page Skeleton — 在 Suspense fallback 与 loading.tsx 复用。
 */
export function FinancePageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Budget widget skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <div className="h-5 w-40 rounded bg-muted animate-pulse" />
          <div className="h-3 w-64 rounded bg-muted animate-pulse mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                <div className="h-5 w-24 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                </div>
                <div className="h-2 w-full rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Record table skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between">
            <div className="space-y-1">
              <div className="h-5 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-40 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-8 w-24 rounded bg-muted animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0"
              >
                <div className="h-3 w-12 rounded bg-muted animate-pulse" />
                <div className="h-5 w-14 rounded-full bg-muted animate-pulse" />
                <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
                <div className="h-3 flex-1 rounded bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
