'use client';

import * as React from 'react';
import {
  CheckCircle2,
  ChefHat,
  Flame,
  Loader2,
  ShoppingCart,
  Sparkles,
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
import { cn } from '@/lib/utils';
import { generateAIRecipe } from '@/actions/pantry';
import type { AIRecipeParams, Recipe } from '@/actions/pantry';
import { createTask } from '@/actions/tasks';

// ============================================================
// Goal & Meal options
// ============================================================

const GOAL_OPTIONS: Array<{ value: string; label: string; emoji: string }> = [
  { value: '减脂增肌（高蛋白、控制碳水）', label: '减脂增肌', emoji: '💪' },
  { value: '极简快手（20 分钟内、食材最少）', label: '极简快手', emoji: '⚡' },
  { value: '清理冰箱（最大化消耗现有食材）', label: '清理冰箱', emoji: '🧹' },
];

const MEAL_OPTIONS: Array<{
  value: NonNullable<AIRecipeParams['targetMeal']>;
  label: string;
  emoji: string;
}> = [
  { value: 'BREAKFAST', label: '早餐', emoji: '🌅' },
  { value: 'LUNCH', label: '午餐', emoji: '☀️' },
  { value: 'DINNER', label: '晚餐', emoji: '🌙' },
];

const LOADING_MESSAGES = [
  '正在翻你家冰箱...',
  '算营养配比...',
  '准备开火...',
];

// ============================================================
// Main Component
// ============================================================

export function AIRecipeGenerator() {
  const [goal, setGoal] = React.useState<string>(GOAL_OPTIONS[0].value);
  const [meal, setMeal] = React.useState<NonNullable<AIRecipeParams['targetMeal']>>(
    'LUNCH',
  );
  const [recipes, setRecipes] = React.useState<Recipe[] | null>(null);
  const [meta, setMeta] = React.useState<{ used: number; total: number } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loadingMsgIndex, setLoadingMsgIndex] = React.useState(0);
  const [createdTaskIds, setCreatedTaskIds] = React.useState<Set<string>>(
    new Set(),
  );

  // 轮播 loading 文案
  React.useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => {
      setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1600);
    return () => clearInterval(t);
  }, [loading]);

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await generateAIRecipe({
        dietaryGoal: goal,
        targetMeal: meal,
      });
      setRecipes(result.recipes);
      setMeta({ used: result.pantryUsed, total: result.pantryTotal });
      setCreatedTaskIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="grid place-items-center h-7 w-7 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          AI 智能菜谱
          <span className="text-xs text-muted-foreground font-normal">
            · 基于现有食材生成
          </span>
        </CardTitle>
        <CardDescription>
          优先消耗临期食材，缺少的配料一键生成采购任务
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ===== Selectors ===== */}
        <div className="space-y-2.5">
          <SelectorRow
            label="目标"
            options={GOAL_OPTIONS}
            value={goal}
            onChange={setGoal}
          />
          <SelectorRow
            label="时段"
            options={MEAL_OPTIONS}
            value={meal}
            onChange={(v) => setMeal(v as typeof meal)}
          />
        </div>

        {/* ===== Generate button ===== */}
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:opacity-90"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {LOADING_MESSAGES[loadingMsgIndex]}
            </>
          ) : (
            <>
              <ChefHat className="h-4 w-4 mr-2" />
              基于现有食材生成菜谱
            </>
          )}
        </Button>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded">
            {error}
          </p>
        )}

        {/* ===== Results ===== */}
        {recipes && recipes.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-border/60">
            {meta && (
              <p className="text-xs text-muted-foreground">
                本次共消耗冰箱食材{' '}
                <span className="font-mono font-semibold text-foreground">
                  {meta.used}
                </span>{' '}
                / {meta.total} 种
              </p>
            )}
            {recipes.map((r, i) => (
              <RecipeCard
                key={`${r.name}-${i}`}
                recipe={r}
                index={i}
                created={createdTaskIds.has(r.name)}
                onCreateShopping={async () => {
                  if (r.missingEssentials.length === 0) return;
                  const description = r.missingEssentials
                    .map(
                      (m) =>
                        `- **${m.name}**（${m.suggestedAmount}）：${m.reason}`,
                    )
                    .join('\n');
                  await createTask({
                    title: `买菜 · ${r.name}`,
                    description: `## 缺失食材清单\n\n${description}\n\n_由 AI 菜谱生成于 ${new Date().toLocaleString('zh-CN')}_`,
                    level: 'TASK',
                    priority: 'P2',
                    status: 'TODO',
                    relatedModule: 'HEALTH',
                  });
                  setCreatedTaskIds((prev) => new Set(prev).add(r.name));
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Selector Row
// ============================================================

function SelectorRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string; emoji: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground shrink-0 w-10">
        {label}
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                'flex items-center gap-1 h-7 px-2.5 rounded-full border text-xs transition-colors',
                active
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border/60 hover:bg-muted/40',
              )}
            >
              <span>{o.emoji}</span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Recipe Card
// ============================================================

function RecipeCard({
  recipe,
  index,
  created,
  onCreateShopping,
}: {
  recipe: Recipe;
  index: number;
  created: boolean;
  onCreateShopping: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = React.useState(false);

  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden animate-in fade-in-50 slide-in-from-bottom-2">
      {/* Header */}
      <div className="px-3 py-2.5 bg-muted/30 border-b border-border/60">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">{recipe.emoji}</span>
              <h4 className="font-semibold text-sm truncate">
                #{index + 1} {recipe.name}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {recipe.description}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px] gap-1">
            ⏱ {recipe.cookTimeMinutes} 分钟
          </Badge>
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-4 gap-px bg-border/40 border-b border-border/60">
        <MacroCell label="热量" value={`${recipe.calories}`} unit="kcal" emoji="🔥" tone="amber" />
        <MacroCell label="蛋白" value={`${recipe.protein}`} unit="g" emoji="🥩" tone="rose" />
        <MacroCell label="碳水" value={`${recipe.carbs}`} unit="g" emoji="🍚" tone="sky" />
        <MacroCell label="脂肪" value={`${recipe.fat}`} unit="g" emoji="🥑" tone="emerald" />
      </div>

      {/* Ingredients + Steps + Missing */}
      <div className="p-3 space-y-3 text-xs">
        {/* Ingredients */}
        <section>
          <div className="font-medium text-foreground mb-1.5">📋 食材</div>
          <ul className="space-y-1">
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <span
                  className={cn(
                    'shrink-0 h-4 w-4 rounded-full grid place-items-center text-[10px]',
                    ing.fromPantry
                      ? 'bg-emerald-500/20 text-emerald-700'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {ing.fromPantry ? '✓' : '·'}
                </span>
                <span className={cn(!ing.fromPantry && 'italic')}>
                  {ing.name} · {ing.amount}
                </span>
                {ing.fromPantry && (
                  <Badge variant="outline" className="text-[10px] px-1 h-4 ml-auto">
                    冰箱
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Steps */}
        <section>
          <div className="font-medium text-foreground mb-1.5">
            👨‍🍳 步骤
          </div>
          <ol className="space-y-1 list-decimal list-inside marker:text-muted-foreground">
            {recipe.steps.map((s, i) => (
              <li key={i} className="text-muted-foreground leading-relaxed">
                {s}
              </li>
            ))}
          </ol>
        </section>

        {/* Missing essentials */}
        {recipe.missingEssentials.length > 0 && (
          <section className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
            <div className="font-medium text-amber-700 mb-1.5 flex items-center gap-1">
              <ShoppingCart className="h-3.5 w-3.5" />
              缺失食材 ({recipe.missingEssentials.length})
            </div>
            <ul className="space-y-1.5">
              {recipe.missingEssentials.map((m, i) => (
                <li key={i} className="text-amber-900/80">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted-foreground"> · {m.suggestedAmount}</span>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {m.reason}
                  </div>
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-2.5 border-amber-500/40 hover:bg-amber-500/10"
              onClick={async () => {
                setSubmitting(true);
                try {
                  await onCreateShopping();
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting || created}
            >
              {created ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  已加入待办
                </>
              ) : submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  创建中
                </>
              ) : (
                <>
                  <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                  一键生成采购任务
                </>
              )}
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Macro Cell
// ============================================================

function MacroCell({
  label,
  value,
  unit,
  emoji,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  emoji: string;
  tone: 'amber' | 'rose' | 'sky' | 'emerald';
}) {
  const toneClass = {
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    sky: 'text-sky-600',
    emerald: 'text-emerald-600',
  }[tone];
  return (
    <div className="bg-card p-2 text-center">
      <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
        <span>{emoji}</span>
        {label}
      </div>
      <div className={cn('text-sm font-semibold tabular-nums mt-0.5', toneClass)}>
        {value}
        <span className="text-[10px] text-muted-foreground font-normal ml-0.5">
          {unit}
        </span>
      </div>
    </div>
  );
}
