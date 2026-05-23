// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildExportSections, exportFilename } from "./export";

const sections = [
  { articleNo: 2, articleLabel: "제2조(정의)", title: "정의", body: "...", order: 2 },
  { articleNo: 1, articleLabel: null, title: "목적", body: "...", order: 1 },
];

// 최종안 출력 (US9, FR-013) — 내보내기 요청 본문·파일명 구성
describe("buildExportSections", () => {
  it("order 순으로 정렬해 내보낸다", () => {
    const out = buildExportSections(sections);
    expect(out.map((s) => s.order)).toEqual([1, 2]);
  });

  it("article_label 이 없으면 제N조로 채운다", () => {
    const out = buildExportSections(sections);
    expect(out[0].article_label).toBe("제1조");
  });
});

describe("exportFilename", () => {
  it("제목과 형식으로 파일명을 만든다", () => {
    expect(exportFilename("청년 창업 지원 조례", "docx")).toBe(
      "청년 창업 지원 조례.docx",
    );
  });

  it("파일명에 금지 문자는 _ 로 치환한다", () => {
    expect(exportFilename("조례/안:v1", "pdf")).toBe("조례_안_v1.pdf");
  });
});
