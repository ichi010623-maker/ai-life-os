import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Health Page Skeleton — Suspense fallback 与 loading.tsx 复用。
 */
export function HealthPageSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Pantry skeleton */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="h-5 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-48 rounded bg-muted animate-pulse mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border p-2 space-y-2"
                >
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                  <div className="h-5 w-10 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-8 w-20 rounded-full bg-muted animate-pulse"
                />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-lg border bg-card p-3 space-y-2"
                >
                  <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                  <div className="h-7 w-full rounded bg-muted animate-pulse mt-3" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recipe skeleton */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader className="pb-3">
            <div className="h-5 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-48 rounded bg-muted animate-pulse mt-1" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-7 w-20 rounded-full bg-muted animate-pulse" />
              ))}
            </div>
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-7 w-16 rounded-full bg-muted animate-pulse" />
              ))}
            </div>
            <div className="h-10 w-full rounded bg-muted animate-pulse mt-4" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
