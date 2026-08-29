import { TaskTreeSkeleton } from '@/components/tasks/TaskTreeContainer';

/**
 * 路由级 Suspense 兜底
 * - Next.js 在 tasks/page.tsx 的 Server Component 数据未就绪时
 *   自动显示此组件，避免首屏空白。
 */
export default function Loading() {
  return <TaskTreeSkeleton />;
}
