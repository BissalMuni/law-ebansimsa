// 본칙(main) 동적 sub-stage — 순수 로직 (US5). AI 추천 후보 + 선택분 구성.
import type { StageStatus } from "./stages";

export interface SubStageCandidate {
  id: string;
  label: string;
}

// 본칙에 자주 들어가는 실체·보칙 항목 후보 (정비기준 본칙규정). 위키 분석 전 기본 추천.
export const MAIN_SUBSTAGE_CANDIDATES: SubStageCandidate[] = [
  { id: "committee", label: "위원회 구성·운영" },
  { id: "subsidy", label: "보조금·지원" },
  { id: "delegation", label: "사무의 위임·위탁" },
  { id: "survey", label: "실태조사" },
  { id: "cooperation", label: "협력체계 구축" },
  { id: "reward", label: "포상" },
  { id: "report", label: "연차보고·공표" },
];

export interface BuiltSubStage {
  key: string;
  label: string;
  order: number;
  required: boolean;
  status: StageStatus;
  parentId: string;
}

// 선택된 후보 id 들을 sub-stage 로 구성 (모두 available·필수, 고유 key)
export function buildSubStages(
  selectedIds: string[],
  parentId: string,
): BuiltSubStage[] {
  return selectedIds
    .map((id) => MAIN_SUBSTAGE_CANDIDATES.find((c) => c.id === id))
    .filter((c): c is SubStageCandidate => Boolean(c))
    .map((c, i) => ({
      key: `main_${c.id}`,
      label: c.label,
      order: i + 1,
      required: true,
      status: "available" as StageStatus,
      parentId,
    }));
}
