'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * 浏览器端 Supabase 客户端。
 *
 * 适用场景：
 *   - Client Components 中的实时订阅（realtime channel）。
 *   - 需要交互式登录 / 注册的 UI（signInWithPassword / signUp）。
 *
 * 使用方式：
 *   'use client';
 *   import { createClient } from '@/lib/supabase/client';
 *   const supabase = createClient();
 *
 * 注意事项：
 *   - 不要在 Server Components / Server Actions 中调用本函数。
 *     服务端请改用 `@/lib/supabase/server`。
 *   - `database.types.ts` 由 `supabase gen types typescript` 自动生成，
 *     若尚未生成，请先去掉泛型 `<Database>` 以避免类型报错。
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
