'use server';

import { revalidatePath } from 'next/cache';
import { daysUntilExpiry } from '@/lib/dates';
import { z } from 'zod';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// Google Gemini 提供的 OpenAI 兼容端点
const google = createOpenAI({
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
});
import { createClient } from '@/lib/supabase/server';
import type { FoodCategory, FoodStockItem } from '@/types';

// ============================================================
// DB Row Type
// ============================================================

interface FoodRow {
  id: string;
  user_id: string;
  name: string;
  quantity: number | string;
  unit: string;
  category: FoodCategory;
  expiration_date: string;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

function rowToItem(row: FoodRow): FoodStockItem {
  return {
    id: row.id,
    name: row.name,
    quantity:
      typeof row.quantity === 'string'
        ? parseFloat(row.quantity)
        : row.quantity,
    unit: row.unit,
    category: row.category,
    expirationDate: row.expiration_date,
    isLowStock: row.is_low_stock,
  };
}

async function getAuthedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return { supabase, userId: user.id };
}

// ============================================================
// 低库存阈值（quantity ≤ 此值视为低库存）
// ============================================================

const LOW_STOCK_THRESHOLD = 1;

// ============================================================
// Types
// ============================================================

export type FoodStockStatus = 'ALL' | 'EXPIRING_SOON' | 'LOW_STOCK';

export type FoodStockFilters = {
  category?: FoodCategory;
  status?: FoodStockStatus;
};

function applyStatusFilter(
  items: FoodStockItem[],
  status?: FoodStockStatus,
): FoodStockItem[] {
  if (!status || status === 'ALL') return items;
  if (status === 'EXPIRING_SOON') {
    return items.filter((i) => daysUntilExpiry(i.expirationDate) <= 3);
  }
  if (status === 'LOW_STOCK') {
    return items.filter((i) => i.isLowStock);
  }
  return items;
}

// ============================================================
// getFoodStock
// ============================================================

export async function getFoodStock(
  filters: FoodStockFilters = {},
): Promise<FoodStockItem[]> {
  const { supabase, userId } = await getAuthedClient();

  let query = supabase
    .from('food_stock')
    .select('*')
    .eq('user_id', userId)
    .order('expiration_date', { ascending: true });

  if (filters.category) query = query.eq('category', filters.category);

  const { data, error } = await query;
  if (error) throw new Error(`[getFoodStock] ${error.message}`);

  const items = (data ?? []).map((r) => rowToItem(r as FoodRow));
  return applyStatusFilter(items, filters.status);
}

// ============================================================
// createFoodStockItem
// ============================================================

export async function createFoodStockItem(
  data: Partial<FoodStockItem>,
): Promise<FoodStockItem> {
  const { supabase, userId } = await getAuthedClient();

  const quantity = data.quantity ?? 1;
  const payload = {
    user_id: userId,
    name: data.name ?? '未命名',
    quantity,
    unit: data.unit ?? '个',
    category: data.category ?? 'VEGETABLE',
    expiration_date:
      data.expirationDate ??
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    is_low_stock: data.isLowStock ?? quantity <= LOW_STOCK_THRESHOLD,
  };

  const { data: created, error } = await supabase
    .from('food_stock')
    .insert(payload)
    .select()
    .single();

  if (error || !created) {
    throw new Error(`[createFoodStockItem] ${error?.message ?? 'insert failed'}`);
  }
  revalidatePath('/health');
  return rowToItem(created as FoodRow);
}

// ============================================================
// updateFoodStockQuantity
// quantity <= 0 时自动删除
// ============================================================

export async function updateFoodStockQuantity(
  id: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    return deleteFoodStockItem(id);
  }

  const { supabase, userId } = await getAuthedClient();
  const isLowStock = quantity <= LOW_STOCK_THRESHOLD;

  const { error } = await supabase
    .from('food_stock')
    .update({ quantity, is_low_stock: isLowStock })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`[updateFoodStockQuantity] ${error.message}`);
  revalidatePath('/health');
}

// ============================================================
// deleteFoodStockItem
// ============================================================

export async function deleteFoodStockItem(id: string): Promise<void> {
  const { supabase, userId } = await getAuthedClient();

  const { error } = await supabase
    .from('food_stock')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`[deleteFoodStockItem] ${error.message}`);
  revalidatePath('/health');
}

// ============================================================
// generateAIRecipe — AI 菜谱生成
// ============================================================

export type Recipe = {
  name: string;
  emoji: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  cookTimeMinutes: number;
  ingredients: Array<{
    name: string;
    amount: string;
    fromPantry: boolean;
  }>;
  steps: string[];
  missingEssentials: Array<{
    name: string;
    suggestedAmount: string;
    reason: string;
  }>;
};

const RecipeSchema = z.object({
  recipes: z
    .array(
      z.object({
        name: z.string().describe('菜名，中文'),
        emoji: z.string().describe('代表 emoji'),
        description: z.string().describe('一句话简介，包含风味与场景'),
        calories: z.number().describe('每份卡路里 kcal'),
        protein: z.number().describe('蛋白质 克'),
        carbs: z.number().describe('碳水 克'),
        fat: z.number().describe('脂肪 克'),
        cookTimeMinutes: z.number().describe('烹饪时长（分钟）'),
        ingredients: z.array(
          z.object({
            name: z.string(),
            amount: z.string().describe("如 '100g' / '1 个' / '1 茶匙'"),
            fromPantry: z.boolean().describe('是否来自用户冰箱'),
          }),
        ),
        steps: z
          .array(z.string())
          .describe('烹饪步骤，每步独立、可执行'),
        missingEssentials: z.array(
          z.object({
            name: z.string(),
            suggestedAmount: z.string(),
            reason: z.string().describe('为什么这道菜需要它'),
          }),
        ),
      }),
    )
    .min(1)
    .max(2),
});

export type AIRecipeParams = {
  dietaryGoal?: string;
  targetMeal?: 'BREAKFAST' | 'LUNCH' | 'DINNER';
};

export type AIRecipeResult = {
  recipes: Recipe[];
  pantryUsed: number;
  pantryTotal: number;
};

const RECIPE_SYSTEM_PROMPT = `你是用户的私人厨师 AI。

你会收到用户的【现有食材清单 + 烹饪目标 + 用餐时段】，请基于此推荐 1-2 道实用家常菜谱。

规则：
1. 优先消耗用户冰箱里的食材（标记 fromPantry: true）。
2. 冰箱没有的关键调味料/配料放入 missingEssentials，并给出建议购买量。
3. 烹饪时长控制在 30 分钟以内，除非用户明确要求复杂菜。
4. 营养估算要现实：一份正餐 300-700 kcal，蛋白质 15-40g。
5. 步骤粒度要可执行（如「中火翻炒 2 分钟」），避免「适量 / 若干」。
6. 若目标是「减脂增肌」，蛋白质占比要高（>25g），碳水要克制。
7. 若目标是「清理冰箱」，尽量覆盖多种不同食材。
8. 输出严格 JSON，不要任何额外说明文字或 markdown 围栏。`;

const MEAL_LABEL: Record<NonNullable<AIRecipeParams['targetMeal']>, string> = {
  BREAKFAST: '早餐',
  LUNCH: '午餐',
  DINNER: '晚餐',
};

export async function generateAIRecipe(
  params: AIRecipeParams = {},
): Promise<AIRecipeResult> {
  const { supabase, userId } = await getAuthedClient();

  // 1) 取当前用户**未过期**的食材（按到期日升序 → 优先消耗临期食材）
  const { data, error } = await supabase
    .from('food_stock')
    .select('*')
    .eq('user_id', userId)
    .gt('expiration_date', new Date().toISOString())
    .order('expiration_date', { ascending: true });

  if (error) throw new Error(`[generateAIRecipe] ${error.message}`);

  const items = (data ?? []).map((r) => rowToItem(r as FoodRow));
  const pantryTotal = items.length;

  // 2) 构造 prompt
  const pantryLines =
    items.length === 0
      ? '（冰箱为空）'
      : items
          .map((i) => {
            const d = daysUntilExpiry(i.expirationDate);
            const expTag = d <= 3 ? `（${d <= 0 ? '已过期' : `还剩 ${d} 天`}）` : '';
            return `- ${i.name} ${i.quantity}${i.unit} · ${i.category}${expTag}`;
          })
          .join('\n');

  const userPrompt = [
    `【用餐时段】${MEAL_LABEL[params.targetMeal ?? 'LUNCH']}`,
    `【烹饪目标】${params.dietaryGoal ?? '营养均衡的家常菜'}`,
    '',
    '【现有食材（已按到期日排序，越靠前越临期）】',
    pantryLines,
    '',
    '请基于上述食材推荐 1-2 道菜，优先消耗靠前的临期食材。',
  ].join('\n');

  // 3) 调用 LLM
  const { object } = await generateObject({
    model: google.chat('gemini-1.5-flash'),
    schema: RecipeSchema,
    system: RECIPE_SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.7,
  });

  // 4) 统计真正被菜谱用到的冰箱食材
  const usedNames = new Set<string>();
  for (const r of object.recipes) {
    for (const ing of r.ingredients) {
      if (ing.fromPantry) usedNames.add(ing.name);
    }
  }

  return {
    recipes: object.recipes,
    pantryUsed: usedNames.size,
    pantryTotal,
  };
}
