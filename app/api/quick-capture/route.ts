import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Universal Quick-Capture Route Handler
 * ----------------------------------------------------------------------
 * POST /api/quick-capture
 * Body  : { input: string }
 * Reply : { intent: CaptureIntent, record: <inserted row> }
 *
 * 流程：
 *   1. Supabase session 鉴权 → 取 user.id
 *   2. Zod 校验请求体
 *   3. 用 Vercel AI SDK 的 generateObject 调用 gpt-4o-mini，
 *      借助 OpenAI Structured Outputs 强制返回 CaptureIntent 形状
 *   4. 根据 targetModule 分发到 5 张表 insert
 *   5. 返回 { intent, record }
 *
 * 注意：
 *   - Vercel AI SDK v3+ 已将 generateObject 默认走 OpenAI strict mode，
 *     Zod schema 会自动转译为 JSON Schema，模型不可能输出 schema 之外的字段。
 *   - 需要先 `npm i ai @ai-sdk/google zod`，并在 .env.local 配置
 *     GOOGLE_GENERATIVE_AI_API_KEY / NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY。
 *   - lib/supabase/database.types.ts 需先通过 `supabase gen types` 生成。
 */

export const runtime = 'nodejs';
export const maxDuration = 30;

// ============================================================
// Schemas
// ============================================================

/** 请求体 */
const RequestSchema = z.object({
  input: z
    .string()
    .min(1, 'input 不能为空')
    .max(2000, 'input 不能超过 2000 字'),
});

/** AI 结构化输出 Schema —— 5 个目标模块的 discriminated union */
export const CaptureIntentSchema = z.discriminatedUnion('targetModule', [
  z.object({
    targetModule: z.literal('FINANCE'),
    data: z.object({
      amount: z.number().positive().describe('金额（正数）'),
      type: z.enum(['INCOME', 'EXPENSE']),
      category: z.enum([
        'FIXED_LIVING',
        'PROTOTYPING_GEAR',
        'SUBSCRIPTION',
        'LIFESTYLE',
        'HEALTH',
      ]),
      note: z.string().describe('备注，尽量保留用户原话'),
    }),
  }),
  z.object({
    targetModule: z.literal('FOOD_STOCK'),
    data: z.object({
      name: z.string().describe('食材名称'),
      quantity: z.number().positive().describe('数量'),
      unit: z.string().describe("单位，如 'kg' / 'g' / '个' / '瓶'"),
      category: z.enum(['MEAT', 'VEGETABLE', 'FRUIT', 'SUPPLEMENT']),
      expirationDate: z
        .string()
        .nullable()
        .optional()
        .describe('ISO 8601 日期；若未提及可省略，DB 层会默认 30 天后'),
    }),
  }),
  z.object({
    targetModule: z.literal('PRODUCT_IDEA'),
    data: z.object({
      title: z.string(),
      category: z.enum(['HARDWARE', 'SOFTWARE', 'ACCESSORY']),
      stage: z.enum(['CONCEPT', 'EVT', 'DVT', 'PVT', 'LAUNCHED']),
      competitorNotes: z.string().nullable().optional(),
    }),
  }),
  z.object({
    targetModule: z.literal('TASK'),
    data: z.object({
      title: z.string(),
      priority: z.enum(['P0', 'P1', 'P2', 'P3']),
      level: z.enum(['GOAL', 'STRATEGIC', 'PROJECT', 'TASK', 'SUBTASK']),
      dueDate: z
        .string()
        .nullable()
        .optional()
        .describe('ISO 8601；含 "明天 / 下周三" 等相对时间需解析为绝对日期'),
    }),
  }),
  z.object({
    targetModule: z.literal('KNOWLEDGE'),
    data: z.object({
      title: z.string(),
      content: z.string().describe('Markdown 内容'),
      tags: z.array(z.string()),
      category: z.enum(['ARTICLE', 'BOOK', 'RESEARCH', 'MEETING']),
    }),
  }),
]);

export type CaptureIntent = z.infer<typeof CaptureIntentSchema>;

// ============================================================
// System Prompt
// ============================================================

export const SYSTEM_PROMPT = `You are the Universal Quick-Capture engine for an AI Life OS workspace.

Given a short, informal natural-language note from the user, classify it into exactly ONE of five target modules and extract a strict typed payload:

  1. FINANCE      — money in or out  (e.g. "午饭外卖 35 元", "freelance 收入 $200")
  2. FOOD_STOCK   — items entering the fridge/pantry  (e.g. "买了两斤鸡胸肉")
  3. PRODUCT_IDEA — hardware/software/accessory ideas  (e.g. "做一个超便携键盘")
  4. TASK         — actionable items  (e.g. "明天下午 3 点前发邮件给投资人")
  5. KNOWLEDGE    — articles/books/research/meeting notes to save

Rules:
- Choose exactly one module that best fits the intent.
- Use enum values EXACTLY as defined in the schema. Do not invent new categories.
- If the note is ambiguous, default to TASK (it is the most general catch-all).
- Titles must be concise (< 80 chars) and capture the user's phrasing.
- Dates must be ISO 8601 (e.g. "2026-09-15"). Resolve relative dates ("明天", "下周三")
  relative to TODAY.
- For FOOD_STOCK quantity/unit: parse Chinese (个/克/斤/kg/瓶/袋) and English units.
- Output JSON only. No commentary, no markdown fences, no explanation.`;

// ============================================================
// Helpers
// ============================================================

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** 根据 targetModule 分发到对应表插入一行 */
async function insertIntent(
  supabase: Supabase,
  userId: string,
  intent: CaptureIntent,
) {
  switch (intent.targetModule) {
    case 'FINANCE': {
      return supabase
        .from('finance_records')
        .insert({
          user_id: userId,
          amount: intent.data.amount,
          type: intent.data.type,
          category: intent.data.category,
          note: intent.data.note,
          date: new Date().toISOString(),
        })
        .select()
        .single();
    }
    case 'FOOD_STOCK': {
      // 用户没提保质期则默认 30 天后，避免 DB NOT NULL 报错
      const expirationDate =
        intent.data.expirationDate ??
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      return supabase
        .from('food_stock')
        .insert({
          user_id: userId,
          name: intent.data.name,
          quantity: intent.data.quantity,
          unit: intent.data.unit,
          category: intent.data.category,
          expiration_date: expirationDate,
          is_low_stock: false,
        })
        .select()
        .single();
    }
    case 'PRODUCT_IDEA': {
      return supabase
        .from('product_ideas')
        .insert({
          user_id: userId,
          title: intent.data.title,
          category: intent.data.category,
          stage: intent.data.stage,
          competitor_notes: intent.data.competitorNotes,
        })
        .select()
        .single();
    }
    case 'TASK': {
      return supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: intent.data.title,
          priority: intent.data.priority,
          level: intent.data.level,
          status: 'TODO',
          due_date: intent.data.dueDate,
        })
        .select()
        .single();
    }
    case 'KNOWLEDGE': {
      return supabase
        .from('knowledge_notes')
        .insert({
          user_id: userId,
          title: intent.data.title,
          content: intent.data.content,
          tags: intent.data.tags,
          category: intent.data.category,
        })
        .select()
        .single();
    }
  }
}

// ============================================================
// POST /api/quick-capture
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // 1. 鉴权
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. 校验请求体
    const body = await request.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', detail: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { input } = parsed.data;

    // 3. LLM 结构化分类
    const { object: intent } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: CaptureIntentSchema,
      system: SYSTEM_PROMPT,
      prompt: input,
      temperature: 0.2,
    });

    // 4. 写入对应表
    const { data: record, error: insertError } = await insertIntent(
      supabase,
      user.id,
      intent,
    );
    if (insertError || !record) {
      console.error('[quick-capture] insert failed', insertError);
      return NextResponse.json(
        {
          error: 'Insert failed',
          detail: insertError?.message,
          intent, // 把分类结果一并返回，客户端可选择重试或修正
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ intent, record });
  } catch (err) {
    console.error('[quick-capture]', err);
    return NextResponse.json(
      {
        error: 'Internal error',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
