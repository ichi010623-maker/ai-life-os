import { getKnowledgeNotes } from '@/actions/knowledge';
import { KnowledgeWorkspace } from '@/components/dashboard/KnowledgeWorkspace';

// 始终实时渲染
export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const initialNotes = await getKnowledgeNotes({ limit: 200 });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Knowledge Base
          </h1>
          <span className="text-xs text-muted-foreground">
            学习沉淀 · 标签筛选 · Markdown 编辑
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          记录读书笔记、研究摘要、会议要点；通过 QuickCapture 也能一键归档
        </p>
      </header>

      <KnowledgeWorkspace initialNotes={initialNotes} />
    </div>
  );
}
