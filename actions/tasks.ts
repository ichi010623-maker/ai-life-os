'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type {
  TaskItem,
  TaskLevel,
  TaskStatus,
  TaskTreeNode,
  Priority,
  RelatedModule,
} from '@/types';

// ============================================================
// DB Row 类型（snake_case，与 SQL 列名一一对应）
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

function partialToRow(data: Partial<TaskItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.title !== undefined) row.title = data.title;
  if (data.description !== undefined) row.description = data.description;
  if (data.level !== undefined) row.level = data.level;
  if (data.parentId !== undefined) row.parent_id = data.parentId;
  if (data.priority !== undefined) row.priority = data.priority;
  if (data.status !== undefined) row.status = data.status;
  if (data.dueDate !== undefined) row.due_date = data.dueDate;
  if (data.relatedModule !== undefined) row.related_module = data.relatedModule;
  if (data.relatedId !== undefined) row.related_id = data.relatedId;
  return row;
}

// ============================================================
// 鉴权 helper
// ============================================================

async function getAuthedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return { supabase, userId: user.id };
}

// ============================================================
// 内部：将扁平列表组装为 5 层树
// ============================================================

const PRIORITY_ORDER: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function buildTree(flat: TaskItem[]): TaskTreeNode[] {
  const map = new Map<string, TaskTreeNode>();
  const roots: TaskTreeNode[] = [];

  // 第一遍：建节点
  for (const task of flat) {
    map.set(task.id, { ...task, children: [] });
  }

  // 第二遍：挂父子
  for (const task of flat) {
    const node = map.get(task.id)!;
    if (task.parentId && map.has(task.parentId)) {
      map.get(task.parentId)!.children.push(node);
    } else {
      // 孤立节点 / 父已被删 → 作为 root 展示，避免丢失
      roots.push(node);
    }
  }

  // 排序：先按 priority，再按 createdAt
  const sortRecursive = (nodes: TaskTreeNode[]) => {
    nodes.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    nodes.forEach((n) => sortRecursive(n.children));
  };
  sortRecursive(roots);

  return roots;
}

// ============================================================
// Public Actions
// ============================================================

/** 读取当前用户的全部任务并组装为 5 层树 */
export async function getTaskTree(): Promise<TaskTreeNode[]> {
  const { supabase, userId } = await getAuthedClient();

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`[getTaskTree] ${error.message}`);
  }
  const flat = (data ?? []).map((row) => rowToTask(row as TaskRow));
  return buildTree(flat);
}

/** 创建任务（可指定 parentId 挂在某节点下） */
export async function createTask(
  data: Partial<TaskItem>,
): Promise<TaskItem> {
  const { supabase, userId } = await getAuthedClient();

  const payload = {
    user_id: userId,
    title: data.title ?? 'Untitled',
    description: data.description,
    level: data.level ?? 'TASK',
    parent_id: data.parentId,
    priority: data.priority ?? 'P2',
    status: data.status ?? 'TODO',
    due_date: data.dueDate,
    related_module: data.relatedModule,
    related_id: data.relatedId,
    ...partialToRow(data), // 兼容其他字段覆盖
  };

  const { data: created, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select()
    .single();

  if (error || !created) {
    throw new Error(`[createTask] ${error?.message}`);
  }
  revalidatePath('/tasks');
  return rowToTask(created as TaskRow);
}

/** 更新状态 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  const { supabase, userId } = await getAuthedClient();

  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`[updateTaskStatus] ${error.message}`);
  }
  revalidatePath('/tasks');
}

/** 更新优先级 */
export async function updateTaskPriority(
  taskId: string,
  priority: Priority,
): Promise<void> {
  const { supabase, userId } = await getAuthedClient();

  const { error } = await supabase
    .from('tasks')
    .update({ priority })
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`[updateTaskPriority] ${error.message}`);
  }
  revalidatePath('/tasks');
}

/** 删除任务（DB 层 ON DELETE CASCADE 自动级联子任务） */
export async function deleteTask(taskId: string): Promise<void> {
  const { supabase, userId } = await getAuthedClient();

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`[deleteTask] ${error.message}`);
  }
  revalidatePath('/tasks');
}
