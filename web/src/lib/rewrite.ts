// 부유 툴바 재작성 — 선택 조문을 AI 의도 프롬프트로 변환 (ui-spec §부유 액션)
export type RewriteKind = "tone" | "short" | "long";

export const REWRITE_ACTIONS: { kind: RewriteKind; label: string }[] = [
  { kind: "tone", label: "다른 톤" },
  { kind: "short", label: "짧게" },
  { kind: "long", label: "풀어쓰기" },
];

const PROMPTS: Record<RewriteKind, string> = {
  tone: "다음 조문을 공공·법령 문체로 다시 써줘",
  short: "다음 조문을 핵심만 남겨 더 간결하게 줄여줘",
  long: "다음 조문을 더 자세히 풀어서 써줘",
};

// 재작성 의도 프롬프트 — 선택 텍스트를 포함 (근거·복제 금지는 api 시스템 프롬프트가 강제, P1/P4)
export function buildRewriteIntent(kind: RewriteKind, text: string): string {
  return `${PROMPTS[kind]}:\n${text}`;
}
