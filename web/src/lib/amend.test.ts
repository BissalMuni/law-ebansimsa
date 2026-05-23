// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildLoadedSections } from "./amend";
import type { ParsedArticle } from "./api-client";

const articles: ParsedArticle[] = [
  { article_no: 1, title: "목적", article_label: "제1조(목적)", body: "이 조례는...", order: 1 },
  { article_no: 2, title: "정의", article_label: "제2조(정의)", body: "용어는...", order: 2 },
];

// 개정 모드 로드 — 파싱된 조를 OrdinanceSection 입력으로 변환 (US6, data-model originalBody)
describe("buildLoadedSections", () => {
  it("파싱 조마다 섹션 입력을 만든다", () => {
    const secs = buildLoadedSections(articles, "p1", "stage1");
    expect(secs).toHaveLength(2);
  });

  it("원본 보존: body 와 originalBody 가 같고 changeType 은 unchanged", () => {
    const [s1] = buildLoadedSections(articles, "p1", "stage1");
    expect(s1.body).toBe("이 조례는...");
    expect(s1.originalBody).toBe("이 조례는...");
    expect(s1.changeType).toBe("unchanged");
  });

  it("projectId·stageId·articleNo·order·label 을 전달한다", () => {
    const [, s2] = buildLoadedSections(articles, "p1", "stage1");
    expect(s2).toMatchObject({
      projectId: "p1",
      stageId: "stage1",
      articleNo: 2,
      order: 2,
      articleLabel: "제2조(정의)",
      title: "정의",
    });
  });
});
