// 단계 잠금 로직 — 순수 함수. 헌법 P2(선형 잠금·우회 불가) + FR-004(확정 수정 → 이후 stale)
// DB 영속은 server/stages.ts 가 이 결과를 받아 Prisma 로 기록한다.

import type { StageStatus } from "./stages";

export interface LockStage {
  id: string;
  order: number;
  status: StageStatus;
  required: boolean;
  staleReason?: string | null;
}

// order 의 단계로 진입 가능한가 — 앞선 모든 필수 단계가 confirmed 여야 한다 (P2)
export function canEnter(stages: LockStage[], order: number): boolean {
  return stages
    .filter((s) => s.order < order && s.required)
    .every((s) => s.status === "confirmed");
}

// 해당 단계를 확정할 수 있는가 — 잠금 단계 우회 금지 (P2)
export function canConfirm(stages: LockStage[], stageId: string): boolean {
  const target = stages.find((s) => s.id === stageId);
  if (!target || target.status === "locked") return false;
  return canEnter(stages, target.order);
}

// 단계 확정: 대상을 confirmed 로, 바로 다음 잠금 단계를 available 로 연다 (P2 진행)
export function applyConfirm(stages: LockStage[], stageId: string): LockStage[] {
  const target = stages.find((s) => s.id === stageId);
  if (!target || target.status === "locked") return stages;

  // 대상 다음(order 가 가장 가까운 큰 값) 단계
  const next = stages
    .filter((s) => s.order > target.order)
    .sort((a, b) => a.order - b.order)[0];

  return stages.map((s) => {
    if (s.id === stageId) return { ...s, status: "confirmed" };
    if (next && s.id === next.id && s.status === "locked") {
      return { ...s, status: "available" };
    }
    return s;
  });
}

// 확정 단계 수정: 대상을 in_progress 로 되돌리고, 이후 confirmed 단계를 stale 로 전파 (FR-004)
export function applyEditConfirmed(
  stages: LockStage[],
  stageId: string,
): LockStage[] {
  const target = stages.find((s) => s.id === stageId);
  if (!target || target.status !== "confirmed") return stages;

  return stages.map((s) => {
    if (s.id === stageId) return { ...s, status: "in_progress" };
    if (s.order > target.order && s.status === "confirmed") {
      return {
        ...s,
        status: "stale",
        staleReason: `이전 단계(${target.order}번)가 수정되어 재검토가 필요합니다`,
      };
    }
    return s;
  });
}
