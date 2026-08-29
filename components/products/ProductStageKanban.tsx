'use client';

import * as React from 'react';
import {
  ExternalLink,
  LayoutGrid,
  List as ListIcon,
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { deleteProductIdea, updateProductStage } from '@/actions/products';
import type {
  ProductCategory,
  ProductIdea,
  ProductStage,
} from '@/types';
import type { ProductWithRelations } from '@/actions/products';
import { CreateProductModal } from './CreateProductModal';

// ============================================================
// Constants
// ============================================================

interface StageDef {
  key: ProductStage;
  emoji: string;
  label: string;
  description: string;
  dotClass: string;
  badgeClass: string;
}

const STAGES: StageDef[] = [
  {
    key: 'CONCEPT',
    emoji: '💡',
    label: 'CONCEPT',
    description: '概念构思',
    dotClass: 'bg-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  },
  {
    key: 'EVT',
    emoji: '🛠️',
    label: 'EVT',
    description: '工程验证',
    dotClass: 'bg-orange-400',
    badgeClass: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  },
  {
    key: 'DVT',
    emoji: '⚙️',
    label: 'DVT',
    description: '设计验证',
    dotClass: 'bg-sky-400',
    badgeClass: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
  },
  {
    key: 'PVT',
    emoji: '🏭',
    label: 'PVT',
    description: '生产验证',
    dotClass: 'bg-violet-400',
    badgeClass: 'bg-violet-500/15 text-violet-700 border-violet-500/30',
  },
  {
    key: 'LAUNCHED',
    emoji: '🚀',
    label: 'LAUNCHED',
    description: '已量产上市',
    dotClass: 'bg-emerald-400',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  },
];

const CATEGORY_META: Record<
  ProductCategory,
  { label: string; emoji: string; badgeClass: string }
> = {
  HARDWARE: {
    label: '硬件',
    emoji: '🔧',
    badgeClass: 'bg-violet-500/10 text-violet-700 border-violet-500/30',
  },
  SOFTWARE: {
    label: '软件',
    emoji: '💿',
    badgeClass: 'bg-sky-500/10 text-sky-700 border-sky-500/30',
  },
  ACCESSORY: {
    label: '配件',
    emoji: '🔌',
    badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  },
};

// ============================================================
// Workspace（顶层 client 容器）
// ============================================================

interface Props {
  initialProducts: ProductWithRelations[];
}

export function ProductStageKanban({ initialProducts }: Props) {
  const [products, setProducts] =
    React.useState<ProductWithRelations[]>(initialProducts);
  const [view, setView] = React.useState<'kanban' | 'list'>('kanban');
  const [showCreate, setShowCreate] = React.useState(false);
  const [detailProduct, setDetailProduct] =
    React.useState<ProductWithRelations | null>(null);

  // 父组件 props 更新（如 revalidatePath 触发）后，把最新数据同步进本地 state
  React.useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  // 详情面板的产品也要保持与最新数据一致（避免阶段变更后还显示旧值）
  React.useEffect(() => {
    if (!detailProduct) return;
    const updated = products.find((p) => p.id === detailProduct.id);
    if (updated && updated !== detailProduct) {
      setDetailProduct(updated);
    }
  }, [products, detailProduct]);

  return (
    <div className="space-y-6">
      {/* ===== Top stats ===== */}
      <ProductStats products={products} />

      {/* ===== Toolbar ===== */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          新建产品灵感
        </Button>

        <div className="ml-auto flex items-center gap-1 rounded-md border border-border/60 p-0.5 bg-muted/30">
          <button
            type="button"
            onClick={() => setView('kanban')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 h-7 rounded text-xs transition-colors',
              view === 'kanban'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            看板
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 h-7 rounded text-xs transition-colors',
              view === 'list'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ListIcon className="h-3.5 w-3.5" />
            列表
          </button>
        </div>
      </div>

      {/* ===== Main view ===== */}
      {view === 'kanban' ? (
        <KanbanView products={products} onCardClick={setDetailProduct} />
      ) : (
        <ListView products={products} onCardClick={setDetailProduct} />
      )}

      {/* ===== Detail dialog ===== */}
      <ProductDetailDialog
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onStageChange={(stage) => {
          if (!detailProduct) return;
          // 乐观更新
          const updated = { ...detailProduct, stage };
          setDetailProduct(updated);
          setProducts((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p)),
          );
        }}
      />

      {/* ===== Create modal ===== */}
      <CreateProductModal open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}

// ============================================================
// Stats Bar
// ============================================================

function ProductStats({ products }: { products: ProductWithRelations[] }) {
  const inProgressHW = products.filter(
    (p) => p.category === 'HARDWARE' && p.stage !== 'LAUNCHED',
  ).length;
  const totalSpent = products.reduce((s, p) => s + p.totalSpent, 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <StatChip label="总项目" value={products.length} tone="default" />
      <StatChip label="在研硬件" value={inProgressHW} tone="violet" />
      <StatChip
        label="累计打样支出"
        value={`¥${totalSpent.toFixed(0)}`}
        tone="rose"
      />
      <div className="hidden md:block col-span-1 lg:col-span-1" />
      {STAGES.map((s) => {
        const count = products.filter((p) => p.stage === s.key).length;
        return (
          <div
            key={s.key}
            className="rounded-lg border border-border/60 bg-card px-3 py-2"
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('h-1.5 w-1.5 rounded-full', s.dotClass)} />
              {s.emoji} {s.label}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{count}</div>
          </div>
        );
      })}
    </div>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: 'default' | 'violet' | 'rose';
}) {
  const toneClass = {
    default: 'text-foreground',
    violet: 'text-violet-600',
    rose: 'text-rose-600',
  }[tone];

  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-lg font-semibold tabular-nums', toneClass)}>
        {value}
      </div>
    </div>
  );
}

// ============================================================
// Kanban View（5 列 + 拖拽）
// ============================================================

function KanbanView({
  products,
  onCardClick,
}: {
  products: ProductWithRelations[];
  onCardClick: (p: ProductWithRelations) => void;
}) {
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [hoverStage, setHoverStage] = React.useState<ProductStage | null>(null);
  const [, startTransition] = React.useTransition();

  const byStage = React.useMemo(() => {
    const map = new Map<ProductStage, ProductWithRelations[]>();
    STAGES.forEach((s) => map.set(s.key, []));
    for (const p of products) {
      map.get(p.stage)?.push(p);
    }
    return map;
  }, [products]);

  const move = (id: string, stage: ProductStage) => {
    startTransition(async () => {
      await updateProductStage(id, stage);
    });
    setDraggedId(null);
    setHoverStage(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
      {STAGES.map((stage) => {
        const items = byStage.get(stage.key) ?? [];
        const isHover = hoverStage === stage.key && draggedId !== null;
        return (
          <div
            key={stage.key}
            className={cn(
              'shrink-0 w-72 rounded-lg border bg-muted/20 flex flex-col',
              'transition-colors',
              isHover ? 'border-violet-500/50 bg-violet-500/5' : 'border-border/60',
            )}
            style={{ maxHeight: 'calc(100vh - 320px)' }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (hoverStage !== stage.key) setHoverStage(stage.key);
            }}
            onDragLeave={() => {
              if (hoverStage === stage.key) setHoverStage(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain') || draggedId;
              if (id) move(id, stage.key);
            }}
          >
            {/* Column header */}
            <div className="px-3 py-2.5 border-b border-border/60 sticky top-0 bg-muted/30 backdrop-blur rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={cn('h-2 w-2 rounded-full shrink-0', stage.dotClass)}
                  />
                  <span className="text-sm font-semibold shrink-0">
                    {stage.emoji} {stage.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                    {stage.description}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs font-mono">
                  {items.length}
                </Badge>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {items.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border/60 rounded-md">
                  拖一个产品到这里
                </div>
              ) : (
                items.map((p) => (
                  <KanbanCard
                    key={p.id}
                    product={p}
                    isDragging={draggedId === p.id}
                    onDragStart={(id) => {
                      setDraggedId(id);
                      // 设置到 dataTransfer 以便 onDrop 拿到
                      // （React 的 SyntheticEvent 不会自动传递，所以同时维护 state）
                    }}
                    onClick={() => onCardClick(p)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Kanban Card
// ============================================================

function KanbanCard({
  product,
  isDragging,
  onDragStart,
  onClick,
}: {
  product: ProductWithRelations;
  isDragging: boolean;
  onDragStart: (id: string) => void;
  onClick: () => void;
}) {
  const catMeta = CATEGORY_META[product.category];
  const specEntries = Object.entries(product.specs ?? {}).slice(0, 3);
  const moreSpecs = Object.keys(product.specs ?? {}).length - specEntries.length;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', product.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(product.id);
      }}
      onDragEnd={() => onDragStart('')}
      onClick={onClick}
      className={cn(
        'group rounded-md border border-border/60 bg-card p-3',
        'cursor-grab active:cursor-grabbing',
        'hover:border-violet-500/40 hover:shadow-sm transition-all',
        isDragging && 'opacity-40 scale-95',
      )}
    >
      {/* Title + task count */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-sm leading-snug line-clamp-2">
          {product.title}
        </h4>
        {product.linkedTasks.length > 0 && (
          <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 h-5 gap-0.5">
            📋 {product.linkedTasks.length}
          </Badge>
        )}
      </div>

      {/* Category */}
      <Badge
        variant="outline"
        className={cn('text-[10px] px-1.5 h-5 mb-2', catMeta.badgeClass)}
      >
        <span className="mr-1">{catMeta.emoji}</span>
        {catMeta.label}
      </Badge>

      {/* Specs chips */}
      {specEntries.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {specEntries.map(([k, v]) => (
            <span
              key={k}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono"
              title={`${k}: ${String(v)}`}
            >
              {k}: {String(v)}
            </span>
          ))}
          {moreSpecs > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
              +{moreSpecs}
            </span>
          )}
        </div>
      )}

      {/* Competitor notes preview */}
      {product.competitorNotes && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {product.competitorNotes}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
        <span className="text-muted-foreground">已花费</span>
        <span className="font-mono font-medium text-rose-600">
          ¥{product.totalSpent.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// List View
// ============================================================

function ListView({
  products,
  onCardClick,
}: {
  products: ProductWithRelations[];
  onCardClick: (p: ProductWithRelations) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-12 text-center">
        <div className="text-4xl mb-2">🛠️</div>
        <p className="text-sm text-muted-foreground">
          还没有产品灵感，点右上角"新建产品灵感"开始。
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {products.map((p) => {
        const stageDef = STAGES.find((s) => s.key === p.stage)!;
        const catMeta = CATEGORY_META[p.category];
        return (
          <Card
            key={p.id}
            className="cursor-pointer hover:border-violet-500/40 transition-colors"
            onClick={() => onCardClick(p)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base line-clamp-2 leading-snug">
                  {p.title}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1.5 h-5', stageDef.badgeClass)}
                >
                  {stageDef.emoji} {stageDef.label}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1.5 h-5', catMeta.badgeClass)}
                >
                  {catMeta.emoji} {catMeta.label}
                </Badge>
                {p.linkedTasks.length > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 h-5">
                    📋 {p.linkedTasks.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.keys(p.specs ?? {}).length > 0 && (
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {Object.entries(p.specs ?? {})
                    .slice(0, 3)
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .join(' · ')}
                </div>
              )}
              {p.competitorNotes && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {p.competitorNotes}
                </p>
              )}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
                <span className="text-muted-foreground">已花费</span>
                <span className="font-mono font-medium text-rose-600">
                  ¥{p.totalSpent.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================
// Detail Dialog
// ============================================================

function ProductDetailDialog({
  product,
  onClose,
  onStageChange,
}: {
  product: ProductWithRelations | null;
  onClose: () => void;
  onStageChange: (stage: ProductStage) => void;
}) {
  const [, startTransition] = React.useTransition();

  const handleDelete = () => {
    if (!product) return;
    if (
      !window.confirm(
        `确认删除「${product.title}」？\n\n关联任务不会被删除，但会失去联动。`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteProductIdea(product.id);
        onClose();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : '删除失败');
      }
    });
  };

  if (!product) return null;
  const catMeta = CATEGORY_META[product.category];
  const stageDef = STAGES.find((s) => s.key === product.stage)!;
  const specEntries = Object.entries(product.specs ?? {});

  return (
    <Dialog
      open={!!product}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent
        key={product.id}
        className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <span className="line-clamp-2">{product.title}</span>
          </DialogTitle>
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <Badge
              variant="outline"
              className={cn('text-xs', stageDef.badgeClass)}
            >
              {stageDef.emoji} {stageDef.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-xs', catMeta.badgeClass)}
            >
              {catMeta.emoji} {catMeta.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Stage switcher */}
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground shrink-0">
              切换阶段
            </Label>
            <Select
              value={product.stage}
              onValueChange={(v) => onStageChange(v as ProductStage)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.emoji} {s.label}
                    <span className="ml-1 text-muted-foreground text-xs">
                      · {s.description}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Specs */}
          {specEntries.length > 0 && (
            <section>
              <Label className="text-xs text-muted-foreground">核心规格</Label>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {specEntries.map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5"
                  >
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                      {k}
                    </div>
                    <div className="text-xs font-mono mt-0.5 break-all">
                      {String(v)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Competitor notes */}
          {product.competitorNotes && (
            <section>
              <Label className="text-xs text-muted-foreground">竞品情报</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap leading-relaxed">
                {product.competitorNotes}
              </p>
            </section>
          )}

          {/* Linked tasks */}
          <section>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                关联任务 ({product.linkedTasks.length})
              </Label>
            </div>
            {product.linkedTasks.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">无关联任务</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {product.linkedTasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 text-sm rounded px-2 py-1 hover:bg-muted/40"
                  >
                    <Badge variant="outline" className="text-[10px]">
                      {t.level}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {t.priority}
                    </Badge>
                    <span
                      className={cn(
                        'flex-1 truncate',
                        t.status === 'COMPLETED' && 'line-through text-muted-foreground',
                      )}
                    >
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Spent summary */}
          <section className="rounded-lg border border-border/60 bg-muted/30 p-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">
                已发生打样 / 订阅支出
              </div>
              <div className="text-2xl font-semibold tabular-nums mt-0.5">
                ¥{product.totalSpent.toFixed(2)}
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {product.relatedExpenses.length} 条
            </Badge>
          </section>

          {/* Recent expenses */}
          {product.relatedExpenses.length > 0 && (
            <section>
              <Label className="text-xs text-muted-foreground">支出明细</Label>
              <ul className="mt-2 divide-y divide-border/40 rounded-md border border-border/60 overflow-hidden">
                {product.relatedExpenses.slice(0, 8).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-muted-foreground shrink-0">
                        {formatDate(r.date)}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {r.category}
                      </Badge>
                      <span className="truncate">{r.note || '—'}</span>
                    </div>
                    <span
                      className={cn(
                        'font-mono tabular-nums shrink-0 ml-2',
                        r.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600',
                      )}
                    >
                      {r.type === 'INCOME' ? '+' : '−'}¥{r.amount.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Meta */}
          <section className="text-[11px] text-muted-foreground font-mono pt-2 border-t border-border/60">
            ID: {product.id}
            <br />
            创建：{formatDate(product.createdAt)} · 更新：{formatDate(product.updatedAt)}
          </section>
        </div>

        <DialogFooter>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            删除
          </Button>
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
