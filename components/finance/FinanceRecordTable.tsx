'use client';

import * as React from 'react';
import { Plus, Search, Trash2, X } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { createFinanceRecord, deleteFinanceRecord } from '@/actions/finance';
import type {
  FinanceCategory,
  FinanceRecord,
  TransactionType,
} from '@/types';

// ============================================================
// Constants
// ============================================================

const CATEGORY_LABEL: Record<FinanceCategory, string> = {
  FIXED_LIVING: '固定生活',
  PROTOTYPING_GEAR: '打样配件',
  SUBSCRIPTION: '软件订阅',
  LIFESTYLE: '生活方式',
  HEALTH: '健康',
};

const TYPE_OPTIONS: Array<{ value: TransactionType | 'ALL'; label: string }> = [
  { value: 'ALL', label: '全部类型' },
  { value: 'INCOME', label: '收入' },
  { value: 'EXPENSE', label: '支出' },
];

const CATEGORY_OPTIONS: Array<{ value: FinanceCategory | 'ALL'; label: string }> = [
  { value: 'ALL', label: '全部分类' },
  ...(Object.entries(CATEGORY_LABEL) as Array<[FinanceCategory, string]>).map(
    ([v, l]) => ({ value: v, label: l }),
  ),
];

// ============================================================
// Main Component
// ============================================================

interface Props {
  initialRecords: FinanceRecord[];
  total: number;
}

export function FinanceRecordTable({ initialRecords, total }: Props) {
  const [typeFilter, setTypeFilter] = React.useState<TransactionType | 'ALL'>(
    'ALL',
  );
  const [categoryFilter, setCategoryFilter] = React.useState<
    FinanceCategory | 'ALL'
  >('ALL');
  const [search, setSearch] = React.useState('');
  const [showAdd, setShowAdd] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialRecords.filter((r) => {
      if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
      if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
      if (q && !r.note.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [initialRecords, typeFilter, categoryFilter, search]);

  const handleDelete = (id: string) => {
    if (!window.confirm('确认删除这条流水？')) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteFinanceRecord(id);
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base">收支流水</CardTitle>
            <CardDescription>
              共 {total} 条 · 当前显示 {filtered.length} 条
            </CardDescription>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            新增记账
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ===== Filters ===== */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索备注..."
              className="pl-8 h-9 w-44"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <Select
            value={typeFilter}
            onValueChange={(v) =>
              setTypeFilter(v as TransactionType | 'ALL')
            }
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={categoryFilter}
            onValueChange={(v) =>
              setCategoryFilter(v as FinanceCategory | 'ALL')
            }
          >
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(typeFilter !== 'ALL' || categoryFilter !== 'ALL' || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTypeFilter('ALL');
                setCategoryFilter('ALL');
                setSearch('');
              }}
              className="h-9 text-xs"
            >
              清除筛选
            </Button>
          )}
        </div>

        {/* ===== Table ===== */}
        <div className="rounded-md border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">日期</TableHead>
                <TableHead className="w-[80px]">类型</TableHead>
                <TableHead className="w-[120px]">分类</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead>备注</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {initialRecords.length === 0
                      ? '还没有任何记账记录，点右上角"新增记账"开始。'
                      : '没有匹配的记录。'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className={cn(
                      deletingId === r.id && 'opacity-50 pointer-events-none',
                    )}
                  >
                    <TableCell className="text-xs text-muted-foreground font-mono tabular-nums">
                      {formatDate(r.date)}
                    </TableCell>
                    <TableCell>
                      <TypeBadge type={r.type} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {CATEGORY_LABEL[r.category]}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono tabular-nums font-medium',
                        r.type === 'INCOME'
                          ? 'text-emerald-600'
                          : 'text-rose-600',
                      )}
                    >
                      {r.type === 'INCOME' ? '+' : '−'}¥
                      {r.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px]">
                      <span className="line-clamp-1">
                        {r.note || (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        aria-label="Delete record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* ===== Add Modal ===== */}
      <AddRecordDialog open={showAdd} onOpenChange={setShowAdd} />
    </Card>
  );
}

// ============================================================
// Type Badge
// ============================================================

function TypeBadge({ type }: { type: TransactionType }) {
  return (
    <Badge
      className={cn(
        'border-0',
        type === 'INCOME'
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15'
          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15',
      )}
    >
      {type === 'INCOME' ? '收入' : '支出'}
    </Badge>
  );
}

// ============================================================
// Add Record Dialog
// ============================================================

function AddRecordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [type, setType] = React.useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState<FinanceCategory>('LIFESTYLE');
  const [date, setDate] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = React.useState('');
  const [linkedItemId, setLinkedItemId] = React.useState('');
  const [error, setError] = React.useState('');
  const [isPending, startTransition] = React.useTransition();

  const reset = () => {
    setType('EXPENSE');
    setAmount('');
    setCategory('LIFESTYLE');
    setDate(new Date().toISOString().slice(0, 10));
    setNote('');
    setLinkedItemId('');
    setError('');
  };

  // Reset on open
  React.useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-suggest category based on type
  React.useEffect(() => {
    if (type === 'INCOME') {
      // 收入建议使用第一个 income-friendly 分类（这里保持用户当前选择）
    }
  }, [type]);

  const handleSubmit = () => {
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('请输入有效金额');
      return;
    }
    const uuidLike = linkedItemId.trim();
    if (uuidLike && !/^[0-9a-f-]{8,}$/i.test(uuidLike)) {
      setError('关联 ID 格式看起来不是 UUID，请检查');
      return;
    }

    startTransition(async () => {
      try {
        await createFinanceRecord({
          type,
          amount: amt,
          category,
          date: new Date(date).toISOString(),
          note: note.trim(),
          linkedItemId: uuidLike || undefined,
        });
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : '保存失败');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>新增记账</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={cn(
                'py-2 rounded-md border text-sm font-medium transition-colors',
                type === 'EXPENSE'
                  ? 'bg-rose-500/15 border-red-500/40 text-rose-700 dark:text-rose-300'
                  : 'bg-background border-border/60 text-muted-foreground hover:bg-muted/40',
              )}
            >
              支出
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={cn(
                'py-2 rounded-md border text-sm font-medium transition-colors',
                type === 'INCOME'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-background border-border/60 text-muted-foreground hover:bg-muted/40',
              )}
            >
              收入
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">金额</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">日期</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">分类</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as FinanceCategory)}
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(CATEGORY_LABEL) as Array<
                  [FinanceCategory, string]
                >).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">备注</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可备注来源、用途、商家..."
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="linkedItemId" className="text-xs">
              关联物品 ID（可选）
            </Label>
            <Input
              id="linkedItemId"
              value={linkedItemId}
              onChange={(e) => setLinkedItemId(e.target.value)}
              placeholder="如打样的 ProductIdea UUID"
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              粘贴 UUID 可在任务侧反向跳转
            </p>
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? '保存中…' : '保存'}
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
    return new Date(iso).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso.slice(0, 10);
  }
}
