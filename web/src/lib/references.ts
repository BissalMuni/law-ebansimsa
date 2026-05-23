// 참고 조례 → AI 컨텍스트 매핑 — 순수 로직 (US7). 복제 금지(P4)는 api 시스템 프롬프트가 강제.

export interface ReferenceLike {
  title: string;
  municipality?: string | null;
  content: string;
  includedInContext: boolean;
}

export interface DraftReference {
  title: string;
  content?: string;
  municipality?: string;
}

// includedInContext 인 참고만 골라 /draft/generate references 형태로 변환
export function toDraftReferences(refs: ReferenceLike[]): DraftReference[] {
  return refs
    .filter((r) => r.includedInContext)
    .map((r) => ({
      title: r.title,
      content: r.content,
      municipality: r.municipality ?? undefined,
    }));
}
