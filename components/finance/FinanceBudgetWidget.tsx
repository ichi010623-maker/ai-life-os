'use client';

import * as React from 'react';
import {
  AlertTriangle,
  PiggyBank,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FinanceCategory } from '@/types';
import type {
  FinanceBucketSummary,
  FinanceSummary,
} from '@/actions/finance';

// ============================================================
// Bucket 定义（与 actions/finance.ts 中的 BUCKET_MAP 对应）
// ============================================================

interface BucketDef {
  key: keyof FinanceBucketSummary;
  label: string;
  description: string;
  barClass: string;        // Tailwind progress bar 颜色
  textClass: string;       // 文本强调色
  ringClass: string;       // dot 颜色
}

const BUCKETS: BucketDef[] = [
  {
    key: 'FIXED',
    label: '基础生活',
    description: '房租 / 饮食 / 通勤',
    barClass: 'bg-zinc-500',
    textClass: 'text-zinc-700 dark:text-zinc-300',
    ringClass: 'bg-zinc-500',
  },
  {
    key: 'PROTOTYPING',
    label: '产品工作区',
    description: '打样 / 设备 / 软件订阅',
    barClass: 'bg-violet-500',
    textClass: 'text-violet-700 dark:text-violet-300',
    ringClass: 'bg-violet-500',
  },
  {
    key: 'LIFESTYLE',
    label: '个人成长',
    description: '健身 / 穿搭 / 学习 / 健康',
    barClass: 'bg-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    ringClass: 'bg-emerald-500',
  },
];

// ============================================================
// 分类元数据 + 默认阈值
// ============================================================

const CATEGORY_LABEL: Record<FinanceCategory, string> = {
  FIXED_LIVING: '固定生活',
  PROTOTYPING_GEAR: '打样配件',
  SUBSCRIPTION: '软件订阅',
  LIFESTYLE: '生活方式',
  HEALTH: '健康',
};

const DEFAULT_THRESHOLDS: Record<FinanceCategory, number> = {
  FIXED_LIVING: 40,
  PROTOTYPING_GEAR: 20,
  SUBSCRIPTION: 10,
  LIFESTYLE: 15,
  HEALTH: 10,
};

const THRESHOLD_STORAGE_KEY = 'ai-life-os.finance.budget-thresholds.v1';

// ============================================================
// Component
// ============================================================

interface Props {
  summary: FinanceSummary;
}

export function FinanceBudgetWidget({ summary }: Props) {
  const [thresholds, setThresholds] =
    React.useState<Record<FinanceCategory, number>>(DEFAULT_THRESHOLDS);
  const [hydrated, setHydrated] = React.useState(false);

  // 挂载时从 localStorage 恢复阈值
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(THRESHOLD_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<
          Record<FinanceCategory, number>
        >;
        setThresholds((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore corrupted data
    }
    setHydrated(true);
  }, []);

  // 阈值变更后持久化
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        THRESHOLD_STORAGE_KEY,
        JSON.stringify(thresholds),
      );
    } catch {
      // ignore quota errors
    }
  }, [thresholds, hydrated]);

  // 用本月收入做分母；若收入为 0 则不显示百分比（避免除零）
  const incomeRef = summary.totalIncome > 0 ? summary.totalIncome : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <PiggyBank className="h-5 w-5 text-violet-500" />
              月度资金分配
              <span className="text-xs text-muted-foreground font-normal">
                · {summary.month}
              </span>
            </CardTitle>
            <CardDescription>
              基于本月收入动态计算各项支出占比，可调预警阈值
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {summary.recordCount} 条流水
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ===== Top stats ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="总收入"
            value={summary.totalIncome}
            tone="emerald"
          />
          <StatCard
            icon={<Wallet className="h-4 w-4" />}
            label="总支出"
            value={summary.totalExpense}
            tone="rose"
          />
          <StatCard
            icon={<PiggyBank className="h-4 w-4" />}
            label="月度结余"
            value={summary.net}
            tone={summary.net >= 0 ? 'sky' : 'rose'}
            suffix={summary.net >= 0 ? undefined : '⚠️'}
          />
        </div>

        {/* ===== Bucket breakdown ===== */}
        <section className="space-y-3">
          <h4 className="text-sm font-medium">支出分桶</h4>
          <div className="space-y-3">
            {BUCKETS.map((b) => {
              const amount = summary.byBucket[b.key];
              const pct =
                incomeRef !== null ? (amount / incomeRef) * 100 : 0;

              return (
                <div key={b.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full shrink-0',
                          b.ringClass,
                        )}
                      />
                      <span className="font-medium shrink-0">{b.label}</span>
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        {b.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono tabular-nums">
                        {formatCurrency(amount)}
                      </span>
                      {incomeRef !== null && (
                        <Badge
                          variant="secondary"
                          className="font-mono tabular-nums"
                        >
                          {pct.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Progress
                    value={Math.min(pct, 100)}
                    className="h-2"
                    // @ts-expect-error - custom CSS var supported by shadcn Progress
                    indicatorClassName={b.barClass}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== Per-category thresholds ===== */}
        <section className="space-y-4 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              分类预警阈值
              <span className="text-xs text-muted-foreground font-normal">
                (% of 月度收入)
              </span>
            </h4>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
            >
              重置默认
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {(Object.keys(CATEGORY_LABEL) as FinanceCategory[]).map((cat) => (
              <ThresholdRow
                key={cat}
                category={cat}
                label={CATEGORY_LABEL[cat]}
                actualAmount={summary.byCategory[cat] ?? 0}
                incomeRef={incomeRef}
                threshold={thresholds[cat]}
                onChange={(v) => setThresholds({ ...thresholds, [cat]: v })}
              />
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({
  icon,
  label,
  value,
  tone,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'emerald' | 'rose' | 'sky';
  suffix?: string;
}) {
  const toneClass = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    rose: 'text-rose-600 dark:text-rose-400',
    sky: 'text-sky-600 dark:text-sky-400',
  }[tone];

  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          'mt-1 text-lg font-semibold tabular-nums',
          toneClass,
        )}
      >
        {formatCurrency(value)}
        {suffix && <span className="ml-1 text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

function ThresholdRow({
  category,
  label,
  actualAmount,
  incomeRef,
  threshold,
  onChange,
}: {
  category: FinanceCategory;
  label: string;
  actualAmount: number;
  incomeRef: number | null;
  threshold: number;
  onChange: (v: number) => void;
}) {
  const usagePct =
    incomeRef !== null ? (actualAmount / incomeRef) * 100 : 0;
  const isOver = usagePct > threshold;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-mono tabular-nums',
              isOver ? 'text-red-600 font-semibold' : 'text-muted-foreground',
            )}
          >
            {incomeRef !== null ? `${usagePct.toFixed(1)}%` : '—'} / {threshold}%
          </span>
          {isOver && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
              超支
            </Badge>
          )}
        </div>
      </div>
      <Slider
        value={[threshold]}
        min={0}
        max={100}
        step={5}
        onValueChange={(v) => onChange(v[0])}
        className="w-full"
      />
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatCurrency(n: number): string {
  return `¥${n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
