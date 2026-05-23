// 표준 8단계 정의 — data-model §4.1 단일 출처. 헌법 P2 선형 잠금의 기준.
// 순수 모듈(서버/클라이언트 공용). Server Action 시드와 사이드바 표시가 공유한다.

export const STAGE_KEYS = [
  "title",
  "purpose",
  "definition",
  "scope",
  "main",
  "supplementary",
  "review",
  "finalize",
] as const;

export type StageKey = (typeof STAGE_KEYS)[number];

// data-model §4 Stage.status 허용값
export type StageStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "validating"
  | "confirmed"
  | "stale"
  | "failed";

export interface StandardStage {
  key: StageKey;
  label: string;
  order: number;
}

// 키 ↔ 한글 단계명 (data-model §4.1 표 그대로)
export const STANDARD_STAGES: StandardStage[] = [
  { key: "title", label: "제명", order: 1 },
  { key: "purpose", label: "목적", order: 2 },
  { key: "definition", label: "정의", order: 3 },
  { key: "scope", label: "적용범위", order: 4 },
  { key: "main", label: "본칙", order: 5 },
  { key: "supplementary", label: "부칙", order: 6 },
  { key: "review", label: "검토", order: 7 },
  { key: "finalize", label: "완성", order: 8 },
];

export interface SeedStage extends StandardStage {
  required: boolean;
  status: StageStatus;
}

// 신규 프로젝트의 초기 단계 시드 — 첫 단계만 진입 가능(available), 나머지는 잠금(P2)
export function buildSeedStages(): SeedStage[] {
  return STANDARD_STAGES.map((s, i) => ({
    ...s,
    required: true,
    status: i === 0 ? "available" : "locked",
  }));
}
