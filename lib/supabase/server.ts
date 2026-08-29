import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

/**
 * 服务端 Supabase 客户端（Server Components / Server Actions / Route Handlers）。
 *
 * Next.js 版本兼容说明：
 *   - Next.js 15+：`cookies()` 是异步的，本函数必须 `await`。
 *   - Next.js 14.x：`cookies()` 同步返回，去掉 `await` 即可（同时把
 *     `getAll/setAll` 改为 `get/set/remove` 三个方法）。
 *
 * 使用方式：
 *   import { createClient } from '@/lib/supabase/server';
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('tasks').select('*');
 *
 * 关于 auth 会话刷新：
 *   - `setAll` 在 Server Component 中会抛错（cookieStore 只读），
 *     此时用户的会话刷新交由 `middleware.ts` 完成。
 *   - 在 Server Action / Route Handler 中 `setAll` 可写，会自动
 *     把新的 access / refresh token 写回响应。
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component 中 cookieStore 只读，
            // 会话刷新由 middleware.ts 统一处理，此处静默忽略。
          }
        },
      },
    },
  );
}
