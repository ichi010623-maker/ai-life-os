import { getTaskTree } from '@/actions/tasks';
import { TaskTreeContainer } from '@/components/tasks/TaskTreeContainer';

// 始终走 Server Component 实时读取，避免静态缓存掩盖任务状态变化
export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const tree = await getTaskTree();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <span className="text-xs text-muted-foreground">
            GOAL → STRATEGIC → PROJECT → TASK → SUBTASK
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          五层嵌套任务树 · Cmd/Ctrl + K 随时快速录入
        </p>
      </header>

      <TaskTreeContainer initialTree={tree} />
    </div>
  );
}
