'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { createFoodStockItem } from '@/actions/pantry';
import type { FoodCategory } from '@/types';

// ============================================================
// Constants
// ============================================================

const CATEGORIES: Array<{ value: FoodCategory; label: string; emoji: string }> = [
  { value: 'MEAT',       label: '肉禽',  emoji: '🥩' },
  { value: 'VEGETABLE',  label: '蔬菜',  emoji: '🥬' },
  { value: 'FRUIT',      label: '水果',  emoji: '🍎' },
  { value: 'SUPPLEMENT', label: '补剂',  emoji: '💊' },
];

const COMMON_UNITS = ['个', 'g', 'kg', '瓶', '袋', '盒', 'ml', 'L'];

// ============================================================
// Helpers
// ============================================================

function defaultExpirationDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function quickExpiration(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

// ============================================================
// Main Component
// ============================================================

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateFoodModal({ open, onOpenChange }: Props) {
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState<FoodCategory>('VEGETABLE');
  const [quantity, setQuantity] = React.useState('1');
  const [unit, setUnit] = React.useState('个');
  const [expirationDate, setExpirationDate] = React.useState(defaultExpirationDate);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState('');

  // 打开时重置
  React.useEffect(() => {
    if (open) {
      setName('');
      setCategory('VEGETABLE');
      setQuantity('1');
      setUnit('个');
      setExpirationDate(defaultExpirationDate());
      setError('');
    }
  }, [open]);

  const handleSubmit = () => {
    setError('');
    if (!name.trim()) {
      setError('请填写食材名称');
      return;
    }
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError('请填写有效数量');
      return;
    }

    startTransition(async () => {
      try {
        await createFoodStockItem({
          name: name.trim(),
          category,
          quantity: qty,
          unit: unit.trim() || '个',
          expirationDate: new Date(expirationDate).toISOString(),
          isLowStock: qty <= 1,
        });
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : '保存失败');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>录入食材</DialogTitle>
          <DialogDescription>
            添加到冰箱后会自动追踪保质期与库存量
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="food-name">食材名称</Label>
            <Input
              id="food-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：三文鱼 / 西兰花 / 鸡胸肉"
              autoFocus
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>分类</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as FoodCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="mr-1.5">{c.emoji}</span>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">数量</Label>
              <Input
                id="quantity"
                type="number"
                step="0.5"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">单位</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expiration */}
          <div className="space-y-1.5">
            <Label htmlFor="expiration">保质期截止日</Label>
            <Input
              id="expiration"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
            <div className="flex gap-1.5 flex-wrap pt-1">
              {[
                { label: '今天', days: 0 },
                { label: '+3 天', days: 3 },
                { label: '+7 天', days: 7 },
                { label: '+14 天', days: 14 },
                { label: '+30 天', days: 30 },
              ].map((q) => (
                <button
                  key={q.days}
                  type="button"
                  onClick={() => setExpirationDate(quickExpiration(q.days))}
                  className="text-[10px] px-2 h-6 rounded-full border border-border/60 hover:bg-muted/40 transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>
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
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
          >
            {isPending ? '保存中…' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
