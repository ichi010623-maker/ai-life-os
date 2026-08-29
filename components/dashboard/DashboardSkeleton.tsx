import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Dashboard Bento Skeleton — 严格对齐真实网格位置
 */
export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-min">
      {/* Priority card (large, 2x2) */}
      <Card className="relative overflow-hidden md:col-span-2 md:row-span-2">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30" />
        <CardHeader className="pb-3">
          <div className="h-5 w-28 rounded bg-muted animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2 p-2">
              <div className="h-4 w-4 rounded bg-muted animate-pulse" />
              <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Finance card */}
      <Card className="relative overflow-hidden md:col-span-1">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/30 to-teal-500/30" />
        <CardHeader className="pb-3">
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-7 w-32 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted animate-pulse mt-2" />
          <div className="mt-3 space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-0.5">
                <div className="h-3 w-full rounded bg-muted animate-pulse" />
                <div className="h-1 w-full rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Products card */}
      <Card className="relative overflow-hidden md:col-span-1">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/30 to-orange-500/30" />
        <CardHeader className="pb-3">
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-4 w-12 rounded-full bg-muted animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Health card */}
      <Card className="relative overflow-hidden md:col-span-1">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500/30 to-pink-500/30" />
        <CardHeader className="pb-3">
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-7 w-16 rounded bg-muted animate-pulse" />
          <div className="mt-3 space-y-1">
            {[0, 1].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                <div className="h-4 w-14 rounded-full bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes card (wide) */}
      <Card className="relative overflow-hidden md:col-span-2">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500/30 to-cyan-500/30" />
        <CardHeader className="pb-3">
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-md border bg-muted/20 p-2.5 space-y-1.5">
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                <div className="h-2 w-full rounded bg-muted animate-pulse" />
                <div className="h-2 w-2/3 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
