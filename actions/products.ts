'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type {
  FinanceRecord,
  Priority,
  ProductIdea,
  ProductCategory,
  ProductStage,
  RelatedModule,
  TaskItem,
  TaskLevel,
  TaskStatus,
} from '@/types';

// ============================================================
// DB Row Types（snake_case）
// ============================================================

interface ProductRow {
  id: string;
  user_id: string;
  title: string;
  category: ProductCategory;
  stage: ProductStage;
  competitor_notes: string | null;
  specs: Record<string, unknown>;
  linked_task_ids: string[];
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  level: TaskLevel;
  parent_id: string | null;
  priority: Priority;
  status: TaskStatus;
  due_date: string | null;
  related_module: RelatedModule | null;
  related_id: string | null;
  created_at: string;
  updated_at: string;
}

interface FinanceRow {
  id: string;
  user_id: string;
  amount: number | string;
  type: 'INCOME' | 'EXPENSE';
  category: FinanceRecord['category'];
  note: string;
  date: string;
  linked_item_id: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProduct(row: ProductRow): ProductIdea {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    stage: row.stage,
    competitorNotes: row.competitor_notes ?? undefined,
    specs: row.specs,
    linkedTaskIds: row.linked_task_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToTask(row: TaskRow): TaskItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    level: row.level,
    parentId: row.parent_id ?? undefined,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date ?? undefined,
    relatedModule: row.related_module ?? undefined,
    relatedId: row.related_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToFinanceRecord(row: FinanceRow): FinanceRecord {
  return {
    id: row.id,
    amount:
      typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
    type: row.type,
    category: row.category,
    note: row.note,
    date: row.date,
    linkedItemId: row.linked_item_id ?? undefined,
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
// Public Types
// ============================================================

export type ProductFilters = {
  category?: ProductCategory;
  stage?: ProductStage;
};

export type ProductWithRelations = ProductIdea & {
  linkedTasks: TaskItem[];
  relatedExpenses: FinanceRecord[];
  totalSpent: number;
};

// ============================================================
// getProductIdeas — 基础列表
// ============================================================

export async function getProductIdeas(
  filters: ProductFilters = {},
): Promise<ProductIdea[]> {
  const { supabase, userId } = await getAuthedClient();

  let query = supabase
    .from('product_ideas')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.stage) query = query.eq('stage', filters.stage);

  const { data, error } = await query;
  if (error) throw new Error(`[getProductIdeas] ${error.message}`);
  return (data ?? []).map((r) => rowToProduct(r as ProductRow));
}

// ============================================================
// getProductsWithRelations — 一次取齐（3 条 SQL，避免 N+1）
// ============================================================

export async function getProductsWithRelations(
  filters: ProductFilters = {},
): Promise<ProductWithRelations[]> {
  const { supabase, userId } = await getAuthedClient();

  // 1) Products
  let pQuery = supabase
    .from('product_ideas')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (filters.category) pQuery = pQuery.eq('category', filters.category);
  if (filters.stage) pQuery = pQuery.eq('stage', filters.stage);

  const { data: productsData, error: pErr } = await pQuery;
  if (pErr) throw new Error(`[getProductsWithRelations] ${pErr.message}`);

  const products = (productsData ?? []).map((r) =>
    rowToProduct(r as ProductRow),
  );
  if (products.length === 0) return [];

  // 2) 批量取关联任务
  const allLinkedIds = Array.from(
    new Set(products.flatMap((p) => p.linkedTaskIds ?? [])),
  );
  const tasksById = new Map<string, TaskItem>();
  if (allLinkedIds.length > 0) {
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .in('id', allLinkedIds);
    for (const r of tasksData ?? []) {
      tasksById.set(r.id, rowToTask(r as TaskRow));
    }
  }

  // 3) 批量取关联流水
  const productIds = products.map((p) => p.id);
  const expensesByProductId = new Map<string, FinanceRecord[]>();
  const { data: expensesData } = await supabase
    .from('finance_records')
    .select('*')
    .eq('user_id', userId)
    .in('linked_item_id', productIds);
  for (const r of expensesData ?? []) {
    const rec = rowToFinanceRecord(r as FinanceRow);
    if (!rec.linkedItemId) continue;
    const arr = expensesByProductId.get(rec.linkedItemId) ?? [];
    arr.push(rec);
    expensesByProductId.set(rec.linkedItemId, arr);
  }

  // 4) 装配
  return products.map((p) => {
    const linkedTasks = (p.linkedTaskIds ?? [])
      .map((id) => tasksById.get(id))
      .filter((t): t is TaskItem => Boolean(t));
    const relatedExpenses = expensesByProductId.get(p.id) ?? [];
    const totalSpent = relatedExpenses
      .filter((r) => r.type === 'EXPENSE')
      .reduce((sum, r) => sum + r.amount, 0);
    return {
      ...p,
      linkedTasks,
      relatedExpenses,
      totalSpent,
    };
  });
}

// ============================================================
// getProductDetail — 单品详情
// ============================================================

export async function getProductDetail(
  id: string,
): Promise<ProductWithRelations> {
  const all = await getProductsWithRelations();
  const found = all.find((p) => p.id === id);
  if (!found) throw new Error('[getProductDetail] product not found');
  return found;
}

// ============================================================
// createProductIdea
// ============================================================

export async function createProductIdea(
  data: Partial<ProductIdea>,
): Promise<ProductIdea> {
  const { supabase, userId } = await getAuthedClient();

  const payload = {
    user_id: userId,
    title: data.title ?? 'Untitled',
    category: data.category ?? 'HARDWARE',
    stage: data.stage ?? 'CONCEPT',
    competitor_notes: data.competitorNotes ?? null,
    specs: data.specs ?? {},
    linked_task_ids: data.linkedTaskIds ?? [],
  };

  const { data: created, error } = await supabase
    .from('product_ideas')
    .insert(payload)
    .select()
    .single();

  if (error || !created) {
    throw new Error(`[createProductIdea] ${error?.message ?? 'insert failed'}`);
  }
  revalidatePath('/products');
  return rowToProduct(created as ProductRow);
}

// ============================================================
// updateProductStage
// ============================================================

export async function updateProductStage(
  id: string,
  stage: ProductStage,
): Promise<void> {
  const { supabase, userId } = await getAuthedClient();

  const { error } = await supabase
    .from('product_ideas')
    .update({ stage })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`[updateProductStage] ${error.message}`);
  revalidatePath('/products');
}

// ============================================================
// deleteProductIdea
// ============================================================

export async function deleteProductIdea(id: string): Promise<void> {
  const { supabase, userId } = await getAuthedClient();

  const { error } = await supabase
    .from('product_ideas')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`[deleteProductIdea] ${error.message}`);
  revalidatePath('/products');
}
