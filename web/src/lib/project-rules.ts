// 프로젝트 도메인 규칙 — 순수 함수(서버/클라이언트 공용, "use server" 아님)
// data-model §4 허용값과 1:1 (Server Action 은 이 규칙을 거쳐 Prisma 에 쓴다)

import { composeMunicipality } from "./regions";

export const PROJECT_KINDS = ["enact", "amend_partial", "amend_full"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export function isProjectKind(value: unknown): value is ProjectKind {
  return (
    typeof value === "string" &&
    (PROJECT_KINDS as readonly string[]).includes(value)
  );
}

// 개정(일부/전부)은 기존 조례 원문이 있어야 한다
export function isAmendmentKind(kind: ProjectKind): boolean {
  return kind === "amend_partial" || kind === "amend_full";
}

export interface ProjectInput {
  kind: string;
  title: string;
  sido: string;
  sigungu?: string; // 단층제(세종)는 생략
  sourceUrl?: string | null; // 개정 모드: 원문 출처(국가법령정보센터 상세링크)
  originalContent?: string; // 개정 모드: 확보한 조례 원문 (생성 시 조문 파싱)
}

export interface NormalizedProjectInput {
  kind: ProjectKind;
  title: string;
  municipality: string;
  sourceUrl: string | null;
  originalContent: string | null;
}

// 입력을 정규화·검증한다. 위반 시 throw (FR-001)
export function normalizeProjectInput(raw: ProjectInput): NormalizedProjectInput {
  if (!isProjectKind(raw.kind)) {
    throw new Error(`허용되지 않은 작업 종류: ${raw.kind}`);
  }
  const title = raw.title?.trim() ?? "";
  const sido = raw.sido?.trim() ?? "";
  const municipality = composeMunicipality(sido, raw.sigungu);
  const sourceUrl = raw.sourceUrl?.trim() || null;
  const originalContent = raw.originalContent?.trim() || null;

  if (!title) throw new Error("제명(title)은 필수입니다");
  if (!sido) throw new Error("시도는 필수입니다");
  // 개정 모드는 기존 조례 원문 확보가 전제 — 없으면 파싱할 대상이 없다
  if (isAmendmentKind(raw.kind) && !originalContent) {
    throw new Error("개정은 기존 조례 원문이 필요합니다");
  }

  return { kind: raw.kind, title, municipality, sourceUrl, originalContent };
}
