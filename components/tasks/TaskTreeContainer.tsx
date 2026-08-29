'use client';

import * as React from 'react';
import { Filter, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskTreeNode } from './TaskTreeNode';
import { createTask } from '@/actions/tasks';
import { cn } from '@/lib/utils';
import type {
  Priority,
  TaskStatus,
  TaskTreeNode as TaskTreeNodeData,
} from '@/types';

// ============================================================
// Filter options
// ============================================================

const PRIORITY_OPTIONS: Array<{ value: Priority | 'ALL'; label: string }> = [
  { value: 'ALL', label: '全部优先级' },
  { value: 'P0', label: '🔴 P0' },
  { value: 'P1', label: '🟠 P1' },
  { value: 'P2', label: '⚪ P2' },
  { value: 'P3', label: '⚫ P3' },
];

const STATUS_OPTIONS: Array<{ value: TaskStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: '全部状态' },
  { value: 'TODO', label: 'TODO' },
  { value: 'IN_PROGRESS', label: 'IN PROGRESS' },
  { value: 'COMPLETED', label: 'COMPLETED' },
  { value: 'BLOCKED', label: 'BLOCKED' },
];

// ============================================================
// Recursive helpers
// ============================================================

/** 递归过滤：父节点只要有任一后代命中即保留 */
function filterTree(
  nodes: TaskTreeNodeData[],
  predicate: (n: TaskTreeNodeData) => boolean,
): TaskTreeNodeData[] {
  const out: TaskTreeNodeData[] = [];
  for (const node of nodes) {
    const children = filterTree(node.children, predicate);
    if (predicate(node) || children.length > 0) {
      out.push({ ...node, children });
    }
  }
  return out;
}

function countNodes(nodes: TaskTreeNodeData[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0);
}

// ============================================================
// Container
// ============================================================

interface Props {
  initialTree: TaskTreeNodeData[];
}

export function TaskTreeContainer({ initialTree }: Props) {
  const [search, setSearch] = React.useState('');
  const [priority, setPriority] = React.useState<Priority | 'ALL'>('ALL');
  const [status, setStatus] = React.useState<TaskStatus | 'ALL'>('ALL');
  const [showNewGoal, setShowNewGoal] = React.useState(false);
  const [goalTitle, setGoalTitle] = React.useState('');
  const [isPending, startTransition] = React.useTransition();

  const filtered = React.useMemo(() => {
    let cur = initialTree;

    if (priority !== 'ALL' || status !== 'ALL') {
      cur = filterTree(cur, (n) => {
        if (priority !== 'ALL' && n.priority !== priority) return false;
        if (status !== 'ALL' && n.status !== status) return false;
        return true;
      });
    }

    const q = search.trim().toLowerCase();
    if (q) {
      cur = filterTree(
        cur,
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.description?.toLowerCase().includes(q) ?? false),
      );
    }

    return cur;
  }, [initialTree, search, priority, status]);

  const totalCount = React.useMemo(() => countNodes(initialTree), [initialTree]);
  const filteredCount = React.useMemo(() => countNodes(filtered), [filtered]);
  const isEmpty = initialTree.length === 0;
  const isFilteredEmpty = !isEmpty && filtered.length === 0;

  const createGoal = () => {
    const t = goalTitle.trim();
    if (!t) return;
    startTransition(async () => {
      await createTask({ title: t, level: 'GOAL', priority: 'P1', status: 'TODO' });
      setGoalTitle('');
      setShowNewGoal(false);
    });
  };

  return (
    <div className="space-y-4">
      {/* ===== Top toolbar ===== */}
      <div className="flex flex-wrap items-center gap-2">
        {showNewGoal ? (
          <div className="flex items-center gap-2 animate-in fade-in-50">
            <span className="text-sm">👑</span>
            <Input
              autoFocus
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createGoal();
                if (e.key === 'Escape') {
                  setShowNewGoal(false);
                  setGoalTitle('');
                }
              }}
              placeholder="例：2026 年完成独立产品出海"
              className="w-80"
            />
            <Button onClick={createGoal} disabled={!goalTitle.trim() || isPending}>
              创建
            </Button>
            <Button variant="ghost" onClick={() => setShowNewGoal(false)}>
              取消
            </Button>
          </div>
        ) : (
          <Button onClick={() => setShowNewGoal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新建顶级 GOAL
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索任务..."
              className="pl-8 h-9 w-44"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Priority filter */}
          <Select
            value={priority}
            onValueChange={(v) => setPriority(v as Priority | 'ALL')}
          >
            <SelectTrigger className="h-9 w-32">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as TaskStatus | 'ALL')}
          >
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ===== Result meta ===== */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          {filteredCount === totalCount
            ? `共 ${totalCount} 个任务`
            : `显示 ${filteredCount} / ${totalCount} 个任务`}
        </span>
        {(priority !== 'ALL' || status !== 'ALL' || search) && (
          <button
            onClick={() => {
              setPriority('ALL');
              setStatus('ALL');
              setSearch('');
            }}
            className="hover:text-foreground underline-offset-2 hover:underline"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* ===== Tree ===== */}
      <div className="rounded-lg border border-border/60 bg-card p-3 min-h-[280px]">
        {isEmpty ? (
          <EmptyState
            emoji="🌱"
            title="还没有任何任务"
            hint="从创建一个 GOAL 开始你的 5 层任务树。"
          />
        ) : isFilteredEmpty ? (
          <EmptyState
            emoji="🔍"
            title="没有匹配的任务"
            hint="尝试调整搜索关键词或清除筛选条件。"
          />
        ) : (
          <div className="space-y-0.5">
            {filtered.map((node) => (
              <TaskTreeNode key={node.id} node={node} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Empty state
// ============================================================

function EmptyState({
  emoji,
  title,
  hint,
}: {
  emoji: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-3">{emoji}</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}

// ============================================================
// Skeleton（用于 app/(workspace)/tasks/loading.tsx）
// ============================================================

export function TaskTreeSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="h-9 w-32 rounded-md bg-muted animate-pulse" />
        <div className="ml-auto h-9 w-44 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="rounded-lg border bg-card p-3 space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 py-2',
              i > 1 && 'ml-6 border-l border-border/60 pl-3',
            )}
          >
            <div className="h-5 w-5 rounded bg-muted animate-pulse" />
            <div className="h-4 w-5/12 rounded bg-muted animate-pulse" />
            <div className="h-5 w-14 rounded-full bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
