import { notFound } from "next/navigation";

import { getProject } from "@/server/projects";
import { listStages } from "@/server/stages";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { StageSidebar } from "@/components/workspace/StageSidebar";
import { EditorArea } from "@/components/Editor";
import { ChatPanel } from "@/components/ChatPanel";
import { StageConfirmBar } from "@/components/workspace/StageConfirmBar";
import type { StageStatus } from "@/lib/stages";

// 워크스페이스 — DB 를 읽으므로 요청 시 렌더
export const dynamic = "force-dynamic";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  // top-level 단계만 사이드바에 (sub-stage 는 본칙 모달에서, T023)
  const stages = (await listStages(id)).filter((s) => s.parentId === null);
  const stageData = stages.map((s) => ({
    id: s.id,
    key: s.key,
    label: s.label,
    order: s.order,
    status: s.status as StageStatus,
  }));

  return (
    <WorkspaceShell
      project={{
        id: project.id,
        title: project.title,
        kind: project.kind,
        municipality: project.municipality,
        progress: project.progress,
      }}
      stageSidebar={<StageSidebar stages={stageData} />}
      editor={
        <>
          <StageConfirmBar projectId={project.id} stages={stageData} />
          <EditorArea />
        </>
      }
      chat={<ChatPanel projectId={project.id} />}
    />
  );
}
