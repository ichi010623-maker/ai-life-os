'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  FinanceCategory,
  FoodCategory,
  FoodStockItem,
  KnowledgeCategory,
  KnowledgeNote,
  Priority,
  ProductCategory,
  ProductIdea,
  ProductStage,
  RelatedModule,
  TaskItem,
  TaskLevel,
  TaskStatus,
  TransactionType,
} from '@/types';

// ============================================================
// Row Types
// ============================================================

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
  type: TransactionType;
  category: FinanceCategory;
  note: string;
  date: string;
  linked_item_id: string | null;
  created_at: string;
  updated_at: string;
}

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

interface KnowledgeRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  source_url: string | null;
  category: KnowledgeCategory;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Row → Entity mappers
// ============================================================

function rowToTask(r: TaskRow): TaskItem {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    level: r.level,
    parentId: r.parent_id ?? undefined,
    priority: r.priority,
    status: r.status,
    dueDate: r.due_date ?? undefined,
    relatedModule: r.related_module ?? undefined,
    relatedId: r.related_id ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToFinance(r: FinanceRow) {
  return {
    id: r.id,
    amount:
      typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount,
    type: r.type,
    category: r.category,
    note: r.note,
    date: r.date,
    linkedItemId: r.linked_item_id ?? undefined,
  };
}

function rowToProduct(r: ProductRow): ProductIdea {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    stage: r.stage,
    competitorNotes: r.competitor_notes ?? undefined,
    specs: r.specs,
    linkedTaskIds: r.linked_task_ids,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToFood(r: FoodRow): FoodStockItem {
  return {
    id: r.id,
    name: r.name,
    quantity:
      typeof r.quantity === 'string' ? parseFloat(r.quantity) : r.quantity,
    unit: r.unit,
    category: r.category,
    expirationDate: r.expiration_date,
    isLowStock: r.is_low_stock,
  };
}

function rowToKnowledge(r: KnowledgeRow): KnowledgeNote {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    tags: r.tags,
    sourceUrl: r.source_url ?? undefined,
    category: r.category,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ============================================================
// Bucket mapping (与 actions/finance.ts 一致)
// ============================================================

const BUCKET_MAP: Record<FinanceCategory, 'FIXED' | 'PROTOTYPING' | 'LIFESTYLE'> = {
  FIXED_LIVING: 'FIXED',
  PROTOTYPING_GEAR: 'PROTOTYPING',
  SUBSCRIPTION: 'PROTOTYPING',
  LIFESTYLE: 'LIFESTYLE',
  HEALTH: 'LIFESTYLE',
};

// ============================================================
// Public Type
// ============================================================

export interface DashboardSummary {
  generatedAt: string;
  tasks: {
    todayCount: number;
    todayItems: TaskItem[];
    inProgressProjects: TaskItem[];
  };
  finance: {
    totalIncome: number;
    totalExpense: number;
    net: number;
    bucket: { FIXED: number; PROTOTYPING: number; LIFESTYLE: number };
    month: string;
  };
  products: {
    inProgress: ProductIdea[];
  };
  health: {
    expiringCount: number;
    expiringItems: FoodStockItem[];
    lowStockCount: number;
  };
  knowledge: {
    recent: KnowledgeNote[];
  };
}

// ============================================================
// getDashboardSummary —— 6 条 SQL 并行聚合
// ============================================================

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Unauthorized');
  const userId = user.id;

  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1,
  ).toISOString();
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
  ).toISOString();
  const monthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ─── 6 条并行 ───
  const [
    todayTasksRes,
    projectTasksRes,
    financeRes,
    productsRes,
    foodRes,
    notesRes,
  ] = await Promise.all([
    // 1) 今日 / 逾期未完成的任务（按 priority 排序）
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'TODO')
      .lte('due_date', todayEnd)
      .order('priority', { ascending: true })
      .limit(10),
    // 2) 进行中的核心 PROJECT 任务
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'IN_PROGRESS')
      .eq('level', 'PROJECT')
      .order('priority', { ascending: true })
      .limit(5),
    // 3) 当月财务流水
    supabase
      .from('finance_records')
      .select('*')
      .eq('user_id', userId)
      .gte('date', monthStart)
      .lt('date', monthEnd),
    // 4) 在研产品（EVT / DVT）
    supabase
      .from('product_ideas')
      .select('*')
      .eq('user_id', userId)
      .in('stage', ['EVT', 'DVT'])
      .order('updated_at', { ascending: false })
      .limit(5),
    // 5) 冰箱（全部，按到期日升序）
    supabase
      .from('food_stock')
      .select('*')
      .eq('user_id', userId)
      .order('expiration_date', { ascending: true }),
    // 6) 最近 3 条笔记
    supabase
      .from('knowledge_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  // ── Process tasks ──
  const todayItems = (todayTasksRes.data ?? []).map((r) =>
    rowToTask(r as TaskRow),
  );
  const inProgressProjects = (projectTasksRes.data ?? []).map((r) =>
    rowToTask(r as TaskRow),
  );

  // ── Process finance ──
  const financeRecords = (financeRes.data ?? []).map((r) =>
    rowToFinance(r as FinanceRow),
  );
  let totalIncome = 0;
  let totalExpense = 0;
  const bucket = { FIXED: 0, PROTOTYPING: 0, LIFESTYLE: 0 };
  for (const r of financeRecords) {
    if (r.type === 'INCOME') {
      totalIncome += r.amount;
    } else {
      totalExpense += r.amount;
      bucket[BUCKET_MAP[r.category]] += r.amount;
    }
  }

  // ── Process products ──
  const products = (productsRes.data ?? []).map((r) =>
    rowToProduct(r as ProductRow),
  );

  // ── Process health ──
  const foodItems = (foodRes.data ?? []).map((r) => rowToFood(r as FoodRow));
  const expiringItems = foodItems
    .filter((i) => {
      const days = Math.ceil(
        (new Date(i.expirationDate).getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return days <= 3;
    })
    .slice(0, 5);
  const lowStockCount = foodItems.filter((i) => i.isLowStock).length;

  // ── Process notes ──
  const recent = (notesRes.data ?? []).map((r) =>
    rowToKnowledge(r as KnowledgeRow),
  );

  return {
    generatedAt: now.toISOString(),
    tasks: {
      todayCount: todayItems.length,
      todayItems,
      inProgressProjects,
    },
    finance: {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      bucket,
      month: monthLabel,
    },
    products: {
      inProgress: products,
    },
    health: {
      expiringCount: expiringItems.length,
      expiringItems,
      lowStockCount,
    },
    knowledge: {
      recent,
    },
  };
}
