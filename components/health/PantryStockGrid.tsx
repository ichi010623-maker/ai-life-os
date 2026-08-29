'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Apple,
  Carrot,
  ChevronDown,
  Loader2,
  Meat,
  Pill,
  Plus,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  daysUntilExpiry,
} from '@/actions/pantry';
import { deleteFoodStockItem, updateFoodStockQuantity } from '@/actions/pantry';
import type { FoodCategory, FoodStockItem } from '@/types';
import { CreateFoodModal } from './CreateFoodModal';

// ============================================================
// Constants
// ============================================================

interface CategoryDef {
  key: FoodCategory | 'ALL';
  label: string;
  emoji: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
}

const CATEGORIES: CategoryDef[] = [
  { key: 'ALL',        label: '全部',  emoji: '🧺', icon: Carrot,   badgeClass: 'bg-zinc-500/10 text-zinc-700 border-zinc-500/30' },
  { key: 'MEAT',       label: '肉禽',  emoji: '🥩', icon: Meat,     badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/30' },
  { key: 'VEGETABLE',  label: '蔬菜',  emoji: '🥬', icon: Carrot,   badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  { key: 'FRUIT',      label: '水果',  emoji: '🍎', icon: Apple,    badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  { key: 'SUPPLEMENT', label: '补剂',  emoji: '💊', icon: Pill,     badgeClass: 'bg-violet-500/10 text-violet-700 border-violet-500/30' },
];

// ============================================================
// Main Component
// ============================================================

interface Props {
  initialItems: FoodStockItem[];
}

export function PantryStockGrid({ initialItems }: Props) {
  const [items, setItems] = React.useState<FoodStockItem[]>(initialItems);
  const [category, setCategory] = React.useState<FoodCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<
    'ALL' | 'EXPIRING_SOON' | 'LOW_STOCK'
  >('ALL');
  const [showAdd, setShowAdd] = React.useState(false);
  const [, startTransition] = React.useTransition();

  // Sync with server-fetched data on revalidate
  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Stats (computed client-side)
  const stats = React.useMemo(() => {
    let expiring = 0;
    let low = 0;
    for (const i of items) {
      if (daysUntilExpiry(i.expirationDate) <= 3) expiring++;
      if (i.isLowStock) low++;
    }
    return { total: items.length, expiring, low };
  }, [items]);

  // Filtered view
  const filtered = React.useMemo(() => {
    return items.filter((i) => {
      if (category !== 'ALL' && i.category !== category) return false;
      if (statusFilter === 'EXPIRING_SOON' && daysUntilExpiry(i.expirationDate) > 3) return false;
      if (statusFilter === 'LOW_STOCK' && !i.isLowStock) return false;
      return true;
    });
  }, [items, category, statusFilter]);

  const adjust = (id: string, delta: number) => {
    setItems((prev) => {
      const next: FoodStockItem[] = [];
      for (const i of prev) {
        if (i.id !== id) {
          next.push(i);
          continue;
        }
        const newQty = i.quantity + delta;
        if (newQty <= 0) {
          // 数量归零 → 乐观删除
        } else {
          next.push({ ...i, quantity: newQty, isLowStock: newQty <= 1 });
        }
      }
      return next;
    });
    startTransition(async () => {
      const target = items.find((i) => i.id === id);
      if (!target) return;
      const newQty = target.quantity + delta;
      await updateFoodStockQuantity(id, newQty);
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确认删除此食材？')) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
    startTransition(async () => {
      await deleteFoodStockItem(id);
    });
  };

  const categoryCount = (key: FoodCategory | 'ALL') =>
    key === 'ALL'
      ? items.length
      : items.filter((i) => i.category === key).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              🧊 食材冰箱
              <span className="text-xs text-muted-foreground font-normal">
                · 共 {stats.total} 项
              </span>
            </CardTitle>
            <CardDescription>
              自动追踪保质期与库存量，临期 / 低库存智能提示
            </CardDescription>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            录入食材
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ===== Stats bar ===== */}
        <div className="grid grid-cols-3 gap-2">
          <StatChip
            label="总食材种数"
            value={stats.total}
            tone="default"
            emoji="🧺"
          />
          <StatChip
            label="⚠️ 临期（≤3 天）"
            value={stats.expiring}
            tone={stats.expiring > 0 ? 'amber' : 'default'}
            onClick={() =>
              setStatusFilter(
                statusFilter === 'EXPIRING_SOON' ? 'ALL' : 'EXPIRING_SOON',
              )
            }
            active={statusFilter === 'EXPIRING_SOON'}
          />
          <StatChip
            label="📉 低库存预警"
            value={stats.low}
            tone={stats.low > 0 ? 'rose' : 'default'}
            onClick={() =>
              setStatusFilter(
                statusFilter === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK',
              )
            }
            active={statusFilter === 'LOW_STOCK'}
          />
        </div>

        {/* ===== Category tabs ===== */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => {
            const count = categoryCount(c.key);
            const active = category === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={cn(
                  'flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs whitespace-nowrap transition-colors',
                  active
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border/60 hover:bg-muted/40',
                )}
              >
                <span>{c.emoji}</span>
                <span className="font-medium">{c.label}</span>
                <span
                  className={cn(
                    'px-1.5 rounded-full text-[10px] font-mono',
                    active ? 'bg-background/20' : 'bg-muted',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ===== Grid ===== */}
        {filtered.length === 0 ? (
          <EmptyState category={category} onAdd={() => setShowAdd(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((item) => (
              <PantryCard
                key={item.id}
                item={item}
                onAdjust={(delta) => adjust(item.id, delta)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* ===== Create modal ===== */}
      <CreateFoodModal open={showAdd} onOpenChange={setShowAdd} />
    </Card>
  );
}

// ============================================================
// Stats Chip
// ============================================================

function StatChip({
  label,
  value,
  tone,
  emoji,
  onClick,
  active,
}: {
  label: string;
  value: number;
  tone: 'default' | 'amber' | 'rose';
  emoji?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const toneClass = {
    default: 'text-foreground',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
  }[tone];

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'rounded-lg border border-border/60 bg-card px-3 py-2 text-left transition-colors',
        onClick && 'hover:bg-muted/40 cursor-pointer',
        active && 'ring-2 ring-violet-500/40',
      )}
    >
      <div className="text-[10px] text-muted-foreground truncate">
        {emoji && <span className="mr-1">{emoji}</span>}
        {label}
      </div>
      <div className={cn('mt-1 text-xl font-semibold tabular-nums', toneClass)}>
        {value}
      </div>
    </Wrapper>
  );
}

// ============================================================
// Food Card
// ============================================================

function PantryCard({
  item,
  onAdjust,
  onDelete,
}: {
  item: FoodStockItem;
  onAdjust: (delta: number) => void;
  onDelete: () => void;
}) {
  const catDef = CATEGORIES.find((c) => c.key === item.category)!;
  const days = daysUntilExpiry(item.expirationDate);
  const expired = days <= 0;
  const expiringSoon = !expired && days <= 3;

  return (
    <div
      className={cn(
        'group rounded-lg border bg-card p-3 transition-all',
        'hover:border-violet-500/40 hover:shadow-sm',
        expired && 'border-rose-500/40 bg-rose-500/5',
        item.isLowStock && !expired && 'border-amber-500/40',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{catDef.emoji}</span>
            <h4 className="font-medium text-sm truncate">{item.name}</h4>
          </div>
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 h-5 mt-1', catDef.badgeClass)}
          >
            {catDef.label}
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="shrink-0 h-6 w-6 grid place-items-center rounded text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="More actions"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expiry badge */}
      <div className="mt-2">
        <ExpiryBadge days={days} expired={expired} expiringSoon={expiringSoon} />
      </div>

      {/* Quantity adjuster */}
      <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5">
        <span className="text-xs text-muted-foreground">剩余</span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAdjust(-1)}
            aria-label="Decrease"
          >
            −
          </Button>
          <span
            className={cn(
              'min-w-[60px] text-center text-sm font-mono tabular-nums font-medium',
              item.quantity <= 1 && 'text-rose-600',
            )}
          >
            {formatQuantity(item.quantity)} {item.unit}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onAdjust(+1)}
            aria-label="Increase"
          >
            +
          </Button>
        </div>
      </div>

      {/* Low stock warning */}
      {item.isLowStock && !expired && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-700">
          <AlertTriangle className="h-3 w-3" />
          低库存，建议补货
        </div>
      )}
    </div>
  );
}

// ============================================================
// Expiry Badge
// ============================================================

function ExpiryBadge({
  days,
  expired,
  expiringSoon,
}: {
  days: number;
  expired: boolean;
  expiringSoon: boolean;
}) {
  if (expired) {
    return (
      <Badge variant="destructive" className="text-[10px] px-1.5 h-5 gap-1">
        ❌ 已过期 {Math.abs(days)} 天
      </Badge>
    );
  }
  if (expiringSoon) {
    return (
      <Badge className="text-[10px] px-1.5 h-5 gap-1 bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/15">
        ⏰ 还有 {days} 天过期
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 h-5 gap-1">
      📅 还可保存 {days} 天
    </Badge>
  );
}

// ============================================================
// Empty State
// ============================================================

function EmptyState({
  category,
  onAdd,
}: {
  category: FoodCategory | 'ALL';
  onAdd: () => void;
}) {
  const cat = CATEGORIES.find((c) => c.key === category)!;
  return (
    <div className="rounded-lg border border-dashed border-border/60 p-12 text-center">
      <div className="text-5xl mb-2">{cat.emoji}</div>
      <p className="text-sm font-medium text-foreground">
        {category === 'ALL' ? '冰箱空空如也' : `${cat.label}区还没有食材`}
      </p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        录入食材后会自动追踪保质期与库存
      </p>
      <Button onClick={onAdd} size="sm">
        <Plus className="h-4 w-4 mr-1" />
        录入第一项
      </Button>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatQuantity(q: number): string {
  // 整数不显示小数，否则显示 1 位
  if (Number.isInteger(q)) return q.toString();
  return q.toFixed(1).replace(/\.0$/, '');
}
