'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronRight,
  Loader2,
  Package,
  Salad,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { updateTaskStatus } from '@/actions/tasks';
import type { DashboardSummary } from '@/actions/dashboard';
import type { TaskItem, TaskStatus } from '@/types';

// ============================================================
// 主网格
// ============================================================

interface Props {
  summary: DashboardSummary;
}

export function DashboardGrid({ summary }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-min">
      <PriorityCard
        count={summary.tasks.todayCount}
        items={summary.tasks.todayItems}
        className="md:col-span-2 md:row-span-2"
        accent="from-violet-500 to-fuchsia-500"
      />
      <FinanceCard
        data={summary.finance}
        className="md:col-span-1"
        accent="from-emerald-500 to-teal-500"
      />
      <ProductsCard
        items={summary.products.inProgress}
        className="md:col-span-1"
        accent="from-amber-500 to-orange-500"
      />
      <HealthCard
        data={summary.health}
        className="md:col-span-1"
        accent="from-rose-500 to-pink-500"
      />
      <NotesCard
        notes={summary.knowledge.recent}
        className="md:col-span-2"
        accent="from-sky-500 to-cyan-500"
      />
    </div>
  );
}

// ============================================================
// 公共：Card Top Accent
// ============================================================

function Accent({ gradient }: { gradient: string }) {
  return (
    <div
      className={cn(
        'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r',
        gradient,
      )}
    />
  );
}

// ============================================================
// 模块 1：今日焦点（Hero / 大卡）
// ============================================================

function PriorityCard({
  count,
  items,
  className,
  accent,
}: {
  count: number;
  items: TaskItem[];
  className?: string;
  accent: string;
}) {
  const [localItems, setLocalItems] = React.useState(items);
  const [, startTransition] = React.useTransition();

  React.useEffect(() => setLocalItems(items), [items]);

  const complete = (id: string) => {
    setLocalItems((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => {
      await updateTaskStatus(id, 'COMPLETED' as TaskStatus);
    });
  };

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <Accent gradient={accent} />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5 text-violet-500" />
          今日焦点
          <Badge variant="secondary" className="ml-1">
            {count} 项待办
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {localItems.length === 0 ? (
          <EmptyHint
            emoji="🎯"
            title="今日待办清空"
            hint="享受片刻轻松，或去任务系统捕捉新灵感"
          />
        ) : (
          localItems.map((t) => (
            <PriorityRow key={t.id} task={t} onComplete={() => complete(t.id)} />
          ))
        )}
        <Link href="/tasks" className="block pt-2">
          <Button variant="ghost" size="sm" className="w-full justify-between">
            打开任务树
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function PriorityRow({
  task,
  onComplete,
}: {
  task: TaskItem;
  onComplete: () => void;
}) {
  const pColor = {
    P0: 'text-red-600 font-bold',
    P1: 'text-orange-500 font-semibold',
    P2: 'text-zinc-500',
    P3: 'text-zinc-400',
  }[task.priority];

  return (
    <div className="group flex items-start gap-2 rounded-md p-2 hover:bg-muted/40 transition-colors">
      <Checkbox
        onCheckedChange={onComplete}
        className="mt-0.5 shrink-0"
        aria-label="Mark complete"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('text-[10px] font-mono', pColor)}>
            {task.priority}
          </span>
          <span className="text-sm truncate">{task.title}</span>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {task.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 模块 2：本月资金流
// ============================================================

function FinanceCard({
  data,
  className,
  accent,
}: {
  data: DashboardSummary['finance'];
  className?: string;
  accent: string;
}) {
  const totalExp = data.totalExpense || 1;
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <Accent gradient={accent} />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          本月资金流
          <span className="text-xs text-muted-foreground font-normal">
            · {data.month}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              'text-2xl font-bold tabular-nums',
              data.net >= 0 ? 'text-emerald-600' : 'text-rose-600',
            )}
          >
            ¥{formatNum(data.net)}
          </span>
          <span className="text-xs text-muted-foreground">月度结余</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          收入 ¥{formatNum(data.totalIncome)} · 支出 ¥{formatNum(data.totalExpense)}
        </div>

        {/* 三大支出桶 */}
        <div className="mt-3 space-y-1.5">
          <BucketBar
            label="基础生活"
            amount={data.bucket.FIXED}
            total={totalExp}
            color="bg-zinc-500"
          />
          <BucketBar
            label="产品研发"
            amount={data.bucket.PROTOTYPING}
            total={totalExp}
            color="bg-violet-500"
          />
          <BucketBar
            label="生活品质"
            amount={data.bucket.LIFESTYLE}
            total={totalExp}
            color="bg-emerald-500"
          />
        </div>

        <Link href="/finance" className="block mt-3">
          <Button variant="ghost" size="sm" className="w-full justify-between">
            财务详情
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function BucketBar({
  label,
  amount,
  total,
  color,
}: {
  label: string;
  amount: number;
  total: number;
  color: string;
}) {
  const pct = Math.min((amount / / total) * 100, 100);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">¥{formatNum(amount)}</span>
      </div>
      <div className="h-1 mt-0.5 bg-muted/60 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// 模块 3：在研项目
// ============================================================

function ProductsCard({
  items,
  className,
  accent,
}: {
  items: DashboardSummary['products']['inProgress'];
  className?: string;
  accent: string;
}) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <Accent gradient={accent} />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4 text-amber-500" />
          在研项目
          <Badge variant="secondary" className="ml-1">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <EmptyHint
            emoji="🛠️"
            title="暂无在研项目"
            hint="EVT / DVT 阶段的项目会显示在这里"
          />
        ) : (
          items.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="truncate flex-1">{p.title}</span>
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 text-[10px] px-1.5',
                  p.stage === 'EVT'
                    ? 'bg-orange-500/10 text-orange-700 border-orange-500/30'
                    : 'bg-sky-500/10 text-sky-700 border-sky-500/30',
                )}
              >
                {p.stage}
              </Badge>
            </div>
          ))
        )}
        <Link href="/products" className="block pt-2">
          <Button variant="ghost" size="sm" className="w-full justify-between">
            产品看板
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 模块 4：食材预警
// ============================================================

function HealthCard({
  data,
  className,
  accent,
}: {
  data: DashboardSummary['health'];
  className?: string;
  accent: string;
}) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <Accent gradient={accent} />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Salad className="h-4 w-4 text-rose-500" />
          食材预警
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-2xl font-bold tabular-nums',
              data.expiringCount > 0 ? 'text-rose-600' : 'text-emerald-600',
            )}
          >
            {data.expiringCount}
          </span>
          <span className="text-xs text-muted-foreground">项临期 ≤3 天</span>
          {data.lowStockCount > 0 && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              📉 {data.lowStockCount} 低库存
            </Badge>
          )}
        </div>

        {data.expiringItems.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {data.expiringItems.slice(0, 3).map((item) => {
              const d = Math.ceil(
                (new Date(item.expirationDate).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              );
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate">{item.name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-[10px] px-1.5',
                      d <= 0
                        ? 'border-rose-500/40 text-rose-600'
                        : 'border-amber-500/40 text-amber-700',
                    )}
                  >
                    {d <= 0 ? `已过期 ${Math.abs(d)} 天` : `还剩 ${d} 天`}
                  </Badge>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            ✅ 冰箱一切正常
          </p>
        )}

        <Link href="/health" className="block pt-2 mt-3">
          <Button variant="ghost" size="sm" className="w-full justify-between">
            打开健康中心
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

// ============================================================
// 模块 5：最新沉淀
// ============================================================

function NotesCard({
  notes,
  className,
  accent,
}: {
  notes: DashboardSummary['knowledge']['recent'];
  className?: string;
  accent: string;
}) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <Accent gradient={accent} />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-sky-500" />
          最新沉淀
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <EmptyHint
            emoji="📚"
            title="还没有学习笔记"
            hint="在 QuickCapture 中提到「收藏」或「记下来」会归档到这里"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {notes.map((n) => (
              <NotePreview key={n.id} note={n} />
            ))}
          </div>
        )}
        <Link href="/knowledge" className="block pt-3">
          <Button variant="ghost" size="sm" className="w-full justify-between">
            知识库
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function NotePreview({ note }: { note: DashboardSummary['knowledge']['recent'][number] }) {
  const catLabel = {
    ARTICLE: '📄 文章',
    BOOK: '📚 书籍',
    RESEARCH: '🔬 研究',
    MEETING: '🤝 会议',
  }[note.category];

  const excerpt =
    note.content.length > 80 ? note.content.slice(0, 80) + ' : : :' : note.content;

  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 hover:border-sky-500/40 transition-colors">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span>{catLabel}</span>
        <span className="ml-auto font-mono">{formatDate(note.createdAt)}</span>
      </div>
      <h5 className="text-sm font-medium mt-1 line-clamp-1">{note.title}</h5>
      {excerpt && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {excerpt}
        </p>
      )}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {note.tags.slice(0, 3).map((t) => (
            <Badge
              key={t}
              variant="outline"
              className="text-[10px] px-1 h-4"
            >
              #{t}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 公共：Empty Hint
// ============================================================

function EmptyHint({
  emoji,
  title,
  hint,
}: {
  emoji: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border/60 p-6 text-center">
      <div className="text-3xl mb-1">{emoji}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatNum(n: number): string {
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso.slice(0, 10);
  }
}
