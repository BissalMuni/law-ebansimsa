// 프로젝트 도메인 규칙 — 순수 함수(서버/클라이언트 공용, "use server" 아님)
// data-model §4 허용값과 1:1 (Server Action 은 이 규칙을 거쳐 Prisma 에 쓴다)

export const PROJECT_KINDS = ["enact", "amend_partial", "amend_full"] as const;
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export function isProjectKind(value: unknown): value is ProjectKind {
  return (
    typeof value === "string" &&
    (PROJECT_KINDS as readonly string[]).includes(value)
  );
}

export interface ProjectInput {
  kind: string;
  title: string;
  municipality: string;
}

export interface NormalizedProjectInput {
  kind: ProjectKind;
  title: string;
  municipality: string;
}

// 입력을 정규화·검증한다. 위반 시 throw (FR-001)
export function normalizeProjectInput(raw: ProjectInput): NormalizedProjectInput {
  if (!isProjectKind(raw.kind)) {
    throw new Error(`허용되지 않은 작업 종류: ${raw.kind}`);
  }
  const title = raw.title?.trim() ?? "";
  const municipality = raw.municipality?.trim() ?? "";
  if (!title) throw new Error("제명(title)은 필수입니다");
  if (!municipality) throw new Error("지자체명(municipality)은 필수입니다");
  return { kind: raw.kind, title, municipality };
}
