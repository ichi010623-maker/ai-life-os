'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { KnowledgeCategory, KnowledgeNote } from '@/types';

// ============================================================
// DB Row Type
// ============================================================

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

function rowToNote(row: KnowledgeRow): KnowledgeNote {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags,
    sourceUrl: row.source_url ?? undefined,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

export interface KnowledgeFilters {
  tag?: string;
  search?: string;
  category?: KnowledgeCategory;
  limit?: number;
}

// ============================================================
// getKnowledgeNotes
// ============================================================

export async function getKnowledgeNotes(
  filters: KnowledgeFilters = {},
): Promise<KnowledgeNote[]> {
  const { supabase, userId } = await getAuthedClient();

  let query = supabase
    .from('knowledge_notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters.tag) query = query.contains('tags', [filters.tag]);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(`title.ilike.${term},content.ilike.${term}`);
  }
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(`[getKnowledgeNotes] ${error.message}`);
  return (data ?? []).map((r) => rowToNote(r as KnowledgeRow));
}

// ============================================================
// createKnowledgeNote
// ============================================================

export async function createKnowledgeNote(
  data: Partial<KnowledgeNote>,
): Promise<KnowledgeNote> {
  const { supabase, userId } = await getAuthedClient();

  const payload = {
    user_id: userId,
    title: data.title ?? 'Untitled',
    content: data.content ?? '',
    tags: data.tags ?? [],
    source_url: data.sourceUrl ?? null,
    category: data.category ?? 'ARTICLE',
  };

  const { data: created, error } = await supabase
    .from('knowledge_notes')
    .insert(payload)
    .select()
    .single();

  if (error || !created) {
    throw new Error(
      `[createKnowledgeNote] ${error?.message ?? 'insert failed'}`,
    );
  }

  // Dashboard 与 Knowledge 页面都依赖此数据
  revalidatePath('/');
  revalidatePath('/knowledge');
  return rowToNote(created as KnowledgeRow);
}

// ============================================================
// deleteKnowledgeNote
// ============================================================

export async function deleteKnowledgeNote(id: string): Promise<void> {
  const { supabase, userId } = await getAuthedClient();

  const { error } = await supabase
    .from('knowledge_notes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(`[deleteKnowledgeNote] ${error.message}`);
  revalidatePath('/');
  revalidatePath('/knowledge');
}
