"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { buildSeedStages, type StageStatus } from "@/lib/stages";
import {
  applyConfirm,
  applyEditConfirmed,
  canConfirm,
  type LockStage,
} from "@/lib/stage-lock";

// 단계 조회·시드·잠금 전이 — Server Actions (DB 는 web 단독 소유)

// top-level 단계를 LockStage 형태로 로드 (잠금 판단은 본칙 sub-stage 제외)
async function loadLockStages(projectId: string): Promise<
  (LockStage & { confirmedAt: Date | null })[]
> {
  const stages = await prisma.stage.findMany({
    where: { projectId, parentId: null },
    orderBy: { order: "asc" },
  });
  return stages.map((s) => ({
    id: s.id,
    order: s.order,
    status: s.status as StageStatus,
    required: s.required,
    staleReason: s.staleReason,
    confirmedAt: s.confirmedAt,
  }));
}

// 변경된 단계만 골라 DB 에 반영하고 진행률을 재계산한다
async function persistStageChanges(
  projectId: string,
  before: LockStage[],
  after: LockStage[],
) {
  const ops = [];
  for (const next of after) {
    const prev = before.find((s) => s.id === next.id)!;
    if (prev.status === next.status && prev.staleReason === next.staleReason) {
      continue;
    }
    ops.push(
      prisma.stage.update({
        where: { id: next.id },
        data: {
          status: next.status,
          staleReason: next.staleReason ?? null,
          // 확정 시각 기록 / 확정 해제 시 초기화
          confirmedAt: next.status === "confirmed" ? new Date() : null,
        },
      }),
    );
  }
  const total = after.length || 1;
  const confirmed = after.filter((s) => s.status === "confirmed").length;
  ops.push(
    prisma.project.update({
      where: { id: projectId },
      data: { progress: Math.round((confirmed / total) * 100) },
    }),
  );
  await prisma.$transaction(ops);
  revalidatePath(`/draft/${projectId}`);
}

// 프로젝트의 단계 목록 (top-level 우선, order 순). sub-stage 는 parentId 로 묶인다.
export async function listStages(projectId: string) {
  return prisma.stage.findMany({
    where: { projectId },
    orderBy: [{ order: "asc" }],
  });
}

// 기존 프로젝트에 표준 8단계가 없을 때 시드 (멱등: 이미 있으면 건너뜀)
export async function seedStages(projectId: string) {
  const existing = await prisma.stage.count({
    where: { projectId, parentId: null },
  });
  if (existing > 0) return;
  await prisma.stage.createMany({
    data: buildSeedStages().map((s) => ({ ...s, projectId })),
  });
}

// 단계 확정 — 잠금 우회 금지(P2). 확정 시 다음 단계 unlock + 진행률 갱신.
// (검증 통과 연동은 T022 에서 호출부가 담당)
export async function confirmStage(projectId: string, stageId: string) {
  const before = await loadLockStages(projectId);
  if (!canConfirm(before, stageId)) {
    throw new Error("이전 단계를 먼저 확정해야 합니다 (P2)");
  }
  const after = applyConfirm(before, stageId);
  await persistStageChanges(projectId, before, after);
}

// 확정 단계 재수정 — 이후 단계를 stale 로 전파 (FR-004)
export async function reopenStage(projectId: string, stageId: string) {
  const before = await loadLockStages(projectId);
  const after = applyEditConfirmed(before, stageId);
  await persistStageChanges(projectId, before, after);
}
