// 개정 모드 — 파싱된 조를 OrdinanceSection 입력으로 변환 (US6)
import type { ParsedArticle } from "./api-client";
import type { SaveSectionInput } from "@/server/sections";

// 로드된 원본 조를 섹션 입력으로. 원본 보존을 위해 originalBody=body, changeType=unchanged (D2)
export function buildLoadedSections(
  articles: ParsedArticle[],
  projectId: string,
  stageId: string,
): SaveSectionInput[] {
  return articles.map((a) => ({
    projectId,
    stageId,
    articleNo: a.article_no,
    articleLabel: a.article_label,
    title: a.title,
    body: a.body,
    originalBody: a.body,
    changeType: "unchanged",
    order: a.order,
  }));
}
