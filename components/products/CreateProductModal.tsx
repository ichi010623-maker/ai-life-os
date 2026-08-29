'use client';

import * as React from 'react';
import { Plus, X } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { createProductIdea } from '@/actions/products';
import type { ProductCategory, ProductStage } from '@/types';

// ============================================================
// Constants
// ============================================================

const CATEGORIES: Array<{ value: ProductCategory; label: string; emoji: string }> = [
  { value: 'HARDWARE', label: '硬件', emoji: '🔧' },
  { value: 'SOFTWARE', label: '软件', emoji: '💿' },
  { value: 'ACCESSORY', label: '配件', emoji: '🔌' },
];

const STAGES: Array<{ value: ProductStage; label: string; emoji: string }> = [
  { value: 'CONCEPT', label: 'CONCEPT', emoji: '💡' },
  { value: 'EVT', label: 'EVT', emoji: '🛠️' },
  { value: 'DVT', label: 'DVT', emoji: '⚙️' },
  { value: 'PVT', label: 'PVT', emoji: '🏭' },
  { value: 'LAUNCHED', label: 'LAUNCHED', emoji: '🚀' },
];

const EMPTY_SPEC = { key: '', value: '' };

// ============================================================
// Create Modal
// ============================================================

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CreateProductModal({ open, onOpenChange }: Props) {
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState<ProductCategory>('HARDWARE');
  const [stage, setStage] = React.useState<ProductStage>('CONCEPT');
  const [competitorNotes, setCompetitorNotes] = React.useState('');
  const [specs, setSpecs] = React.useState<Array<{ key: string; value: string }>>([
    EMPTY_SPEC,
  ]);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState('');

  // 打开时重置
  React.useEffect(() => {
    if (open) {
      setTitle('');
      setCategory('HARDWARE');
      setStage('CONCEPT');
      setCompetitorNotes('');
      setSpecs([{ ...EMPTY_SPEC }]);
      setError('');
    }
  }, [open]);

  const updateSpec = (i: number, field: 'key' | 'value', val: string) => {
    setSpecs((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));
  };
  const addSpec = () => setSpecs((prev) => [...prev, { ...EMPTY_SPEC }]);
  const removeSpec = (i: number) =>
    setSpecs((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const handleSubmit = () => {
    setError('');
    const t = title.trim();
    if (!t) {
      setError('请填写产品名称');
      return;
    }

    // 装配 specs → Record
    const specsObj: Record<string, unknown> = {};
    for (const { key, value } of specs) {
      const k = key.trim();
      if (k) specsObj[k] = tryParseValue(value);
    }

    startTransition(async () => {
      try {
        await createProductIdea({
          title: t,
          category,
          stage,
          competitorNotes: competitorNotes.trim() || undefined,
          specs: specsObj,
          linkedTaskIds: [], // 关联任务可在详情面板后续编辑
        });
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : '创建失败');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新建产品灵感</DialogTitle>
          <DialogDescription>
            记录一款新产品 / 新打样项目，从概念到上市全流程跟进
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="product-title">产品名称</Label>
            <Input
              id="product-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：便携磁吸补光灯 v2"
              autoFocus
            />
          </div>

          {/* Category + Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>品类</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as ProductCategory)}
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
            <div className="space-y-1.5">
              <Label>当前阶段</Label>
              <Select
                value={stage}
                onValueChange={(v) => setStage(v as ProductStage)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="mr-1.5">{s.emoji}</span>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dynamic specs */}
          <div className="space-y-1.5">
            <Label>核心规格</Label>
            <p className="text-[11px] text-muted-foreground -mt-0.5">
              每行一个 key-value（如 <code>battery: 3000mAh</code>），可任意添加
            </p>
            <div className="space-y-2 mt-1">
              {specs.map((spec, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={spec.key}
                    onChange={(e) => updateSpec(i, 'key', e.target.value)}
                    placeholder="参数名 (如 battery)"
                    className="flex-1 font-mono text-xs"
                  />
                  <Input
                    value={spec.value}
                    onChange={(e) => updateSpec(i, 'value', e.target.value)}
                    placeholder="值 (如 3000mAh)"
                    className="flex-1 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSpec(i)}
                    disabled={specs.length === 1}
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Remove spec"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSpec}
                className="w-full"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                添加规格
              </Button>
            </div>
          </div>

          {/* Competitor notes */}
          <div className="space-y-1.5">
            <Label htmlFor="competitor-notes">竞品情报</Label>
            <Textarea
              id="competitor-notes"
              value={competitorNotes}
              onChange={(e) => setCompetitorNotes(e.target.value)}
              placeholder="分析竞品、差异化定位、用户痛点..."
              rows={3}
              className="resize-none"
            />
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
            disabled={isPending || !title.trim()}
          >
            {isPending ? '创建中…' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Helpers
// ============================================================

/**
 * 智能解析规格 value：
 *   - 纯数字 → number
 *   - "true"/"false" → boolean
 *   - 其它 → string
 * 这样后续做图表统计（如电池容量对比）无需再 parse。
 */
function tryParseValue(raw: string): unknown {
  const v = raw.trim();
  if (v === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(v)) return parseFloat(v);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}
