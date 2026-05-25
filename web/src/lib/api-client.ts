// api/(FastAPI 무상태) 호출 래퍼 — web↔api의 유일한 경계 (plan §1·§4)
// 모든 영속화는 web의 Prisma가 단독 소유하고, 여기서는 계산 결과만 받아온다.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

// 위키 근거 1건 — citations 추적용 (헌법 P1)
export interface WikiRef {
  criterion_id: string;
  content?: string;
}

export interface DraftGenerateBody {
  stage_key: string;
  intent: string;
  wiki_refs?: WikiRef[];
  references?: { title: string; content?: string; municipality?: string }[];
}

// SSE 이벤트 — citations 먼저, 이후 delta, 마지막 [DONE]
export type DraftEvent =
  | { type: "citations"; citations: string[] }
  | { type: "delta"; text: string }
  | { type: "done" };

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`API ${path} 실패: ${resp.status}`);
  return resp.json() as Promise<T>;
}

export async function health(): Promise<{ status: string }> {
  const resp = await fetch(`${API_BASE}/health`);
  return resp.json() as Promise<{ status: string }>;
}

// /draft/generate SSE 스트림을 파싱해 이벤트로 흘려준다 (조문 텍스트 + 근거)
export async function* streamDraft(
  body: DraftGenerateBody,
  signal?: AbortSignal,
): AsyncGenerator<DraftEvent> {
  const resp = await fetch(`${API_BASE}/draft/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.body) throw new Error("draft 스트림 응답 본문 없음");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE 프레임은 빈 줄로 구분된다
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.replace(/^data: /, "").trim();
      if (!line) continue;
      if (line === "[DONE]") {
        yield { type: "done" };
        return;
      }
      yield JSON.parse(line) as DraftEvent;
    }
  }
}

export interface ArticleInput {
  article_id: string;
  title: string;
  text: string;
}

export interface CriterionCell {
  criterion_id: string;
  source: "ebansimsa" | "jungbigijun";
  title?: string;
}

export interface ValidationCellResult {
  article_id: string;
  criterion_id: string;
  source: "ebansimsa" | "jungbigijun";
  verdict: "pass" | "fail" | "na" | "pending";
  severity: "hint" | "violation";
  reason?: string | null;
  suggestion?: string | null;
}

export interface PreciseResponse {
  results: ValidationCellResult[];
  total_cells: number;
  filled_cells: number;
  complete: boolean;
}

// 정밀 검증 — 전 셀(조문×기준) 충족 여부를 함께 받는다 (헌법 P3)
export function validatePrecise(body: {
  articles: ArticleInput[];
  criteria: CriterionCell[];
}): Promise<PreciseResponse> {
  return postJson<PreciseResponse>("/validate/precise", body);
}

export function validateInline(body: {
  article: ArticleInput;
  criteria?: CriterionCell[];
}): Promise<{ hints: ValidationCellResult[] }> {
  return postJson("/validate/inline", body);
}

// 전체 검토 매트릭스 (Stage 7) — 2단계 검증, 전 셀 충족 (헌법 P3)
export function validateFull(body: {
  articles: ArticleInput[];
  criteria: CriterionCell[];
}): Promise<PreciseResponse> {
  return postJson<PreciseResponse>("/validate/full", body);
}

export interface ParsedArticle {
  article_no: number;
  title: string;
  article_label: string;
  body: string;
  order: number;
}

export function parseOrdinance(content: string): Promise<{
  articles: ParsedArticle[];
}> {
  return postJson("/parse/ordinance", { content });
}

export interface OrdinanceHit {
  title: string;
  municipality: string | null;
  source_url: string | null;
  id: string | null; // 자치법규일련번호 — 본문 자동 로드 키
}

// 타 지자체 조례 검색 — 국가법령정보센터 OpenAPI (헌법 P4 참고 전용)
export async function searchOrdinances(
  query: string,
  region?: string,
): Promise<{ hits: OrdinanceHit[] }> {
  const params = new URLSearchParams({ query });
  if (region) params.set("region", region);
  const resp = await fetch(`${API_BASE}/search/ordinances?${params}`);
  if (!resp.ok) throw new Error(`검색 실패: ${resp.status}`);
  return resp.json() as Promise<{ hits: OrdinanceHit[] }>;
}

// 자치법규 일련번호로 본문 원문을 자동 로드 (개정 입안 — 복붙 대체)
export async function fetchOrdinanceContent(
  id: string,
): Promise<{ content: string }> {
  const params = new URLSearchParams({ id });
  const resp = await fetch(`${API_BASE}/search/ordinances/content?${params}`);
  if (!resp.ok) throw new Error(`원문 로드 실패: ${resp.status}`);
  return resp.json() as Promise<{ content: string }>;
}

// 출력물은 온디맨드 재생성 — bytes를 받아 다운로드한다 (헌법 P7, blob 비영속)
export async function exportOrdinance(body: {
  project_title: string;
  municipality: string;
  sections: { article_label: string; title: string; body: string; order: number }[];
  format: "docx" | "pdf";
}): Promise<Blob> {
  const resp = await fetch(`${API_BASE}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`export 실패: ${resp.status}`);
  return resp.blob();
}
