// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildMatrixIndex, verdictAt } from "./matrix";
import type { ValidationCellResult } from "./api-client";

const results: ValidationCellResult[] = [
  { article_id: "제1조", criterion_id: "2.1.2", source: "ebansimsa", verdict: "pass", severity: "violation" },
  { article_id: "제1조", criterion_id: "2.1.4", source: "ebansimsa", verdict: "fail", severity: "violation" },
];

// 검토 매트릭스 인덱싱 (Stage 7) — 조문×기준 셀 조회
describe("matrix index", () => {
  it("셀(조문×기준)로 결과를 조회한다", () => {
    const idx = buildMatrixIndex(results);
    expect(verdictAt(idx, "제1조", "2.1.4")).toBe("fail");
    expect(verdictAt(idx, "제1조", "2.1.2")).toBe("pass");
  });

  it("결과 없는 셀은 pending 으로 본다 (미충족, P3)", () => {
    const idx = buildMatrixIndex(results);
    expect(verdictAt(idx, "제2조", "2.1.2")).toBe("pending");
  });
});
