'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type {
  FinanceCategory,
  FinanceRecord,
  TransactionType,
} from '@/types';

// ============================================================
// DB Row 类型（snake_case）
// ============================================================

interface FinanceRow {
  id: string;
  user_id: string;
  /** Postgres numeric → JS string */
  amount: number | string;
  type: TransactionType;
  category: FinanceCategory;
  note: string;
  date: string;
  linked_item_id: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRecord(row: FinanceRow): FinanceRecord {
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
// 公共：月份区间
// ============================================================

function getMonthRange(monthStr?: string): {
  start: string;
  end: string;
  label: string;
} {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0-indexed

  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split('-').map(Number);
    year = y;
    month = m - 1;
  }

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
  const label = `${year}-${String(month + 1).padStart(2, '0')}`;

  return { start: start.toISOString(), end: end.toISOString(), label };
}

// ============================================================
// 公共：3 大支出桶的分类映射
// ============================================================

const BUCKET_MAP: Record<FinanceCategory, 'FIXED' | 'PROTOTYPING' | 'LIFESTYLE'> = {
  FIXED_LIVING: 'FIXED',
  PROTOTYPING_GEAR: 'PROTOTYPING',
  SUBSCRIPTION: 'PROTOTYPING',
  LIFESTYLE: 'LIFESTYLE',
  HEALTH: 'LIFESTYLE',
};

// ============================================================
// Types（导出供前端组件复用）
// ============================================================

export interface FinanceBucketSummary {
  FIXED: number;        // 基础生活 + 固定开支
  PROTOTYPING: number;  // 打样配件 + 软件订阅
  LIFESTYLE: number;    // 生活方式 + 健康
}

export interface FinanceSummary {
  month: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
  byCategory: Partial<Record<FinanceCategory, number>>;
  byBucket: FinanceBucketSummary;
  recordCount: number;
}

// ============================================================
// getFinanceSummary
// ============================================================

export async function getFinanceSummary(month?: string): Promise<FinanceSummary> {
  const { supabase, userId } = await getAuthedClient();
  const { start, end, label } = getMonthRange(month);

  const { data, error } = await supabase
    .from('finance_records')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start)
    .lt('date', end);

  if (error) {
    throw new Error(`[getFinanceSummary] ${error.message}`);
  }

  const records = (data ?? []).map((r) => rowToRecord(r as FinanceRow));

  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory: Partial<Record<FinanceCategory, number>> = {};
  const byBucket: FinanceBucketSummary = { FIXED: 0, PROTOTYPING: 0, LIFESTYLE: 0 };

  for (const r of records) {
    if (r.type === 'INCOME') {
      totalIncome += r.amount;
    } else {
      totalExpense += r.amount;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + r.amount;
      byBucket[BUCKET_MAP[r.category]] += r.amount;
    }
  }

  return {
    month: label,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    byCategory,
    byBucket,
    recordCount: records.length,
  };
}

// ============================================================
// getFinanceRecords（支持分页 + 过滤）
// ============================================================

export interface FinanceFilters {
  type?: TransactionType;
  category?: FinanceCategory;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface FinanceRecordsPage {
  records: FinanceRecord[];
  total: number;
  limit: number;
  offset: number;
}

export async function getFinanceRecords(
  filters: FinanceFilters = {},
): Promise<FinanceRecordsPage> {
  const { supabase, userId } = await getAuthedClient();

  let query = supabase
    .from('finance_records')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (filters.type) query = query.eq('type', filters.type);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.startDate) query = query.gte('date', filters.startDate);
  if (filters.endDate) query = query.lte('date', filters.endDate);

  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`[getFinanceRecords] ${error.message}`);
  }

  return {
    records: (data ?? []).map((r) => rowToRecord(r as FinanceRow)),
    total: count ?? 0,
    limit,
    offset,
  };
}

// ============================================================
// createFinanceRecord
// ============================================================

export async function createFinanceRecord(
  data: Partial<FinanceRecord>,
): Promise<FinanceRecord> {
  const { supabase, userId } = await getAuthedClient();

  const payload = {
    user_id: userId,
    amount: data.amount ?? 0,
    type: data.type ?? 'EXPENSE',
    category: data.category ?? 'LIFESTYLE',
    note: data.note ?? '',
    date: data.date ?? new Date().toISOString(),
    linked_item_id: data.linkedItemId ?? null,
  };

  const { data: created, error } = await supabase
    .from('finance_records')
    .insert(payload)
    .select()
    .single();

  if (error || !created) {
    throw new Error(`[createFinanceRecord] ${error?.message ?? 'insert failed'}`);
  }

  revalidatePath('/finance');
  return rowToRecord(created as FinanceRow);
}

// ============================================================
// deleteFinanceRecord
// ============================================================

export async function deleteFinanceRecord(id: string): Promise<void> {
  const { supabase, userId } = await getAuthedClient();

  const { error } = await supabase
    .from('finance_records')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`[deleteFinanceRecord] ${error.message}`);
  }

  revalidatePath('/finance');
}
