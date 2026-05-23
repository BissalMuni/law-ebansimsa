// @vitest-environment node
import { describe, expect, it } from "vitest";
import { toProblems, sortProblems } from "./problems";
import type { ValidationCellResult } from "./api-client";

function cell(
  verdict: ValidationCellResult["verdict"],
  severity: ValidationCellResult["severity"],
  criterion = "3.3.1",
  reason?: string,
): ValidationCellResult {
  return {
    article_id: "a1",
    criterion_id: criterion,
    source: "ebansimsa",
    verdict,
    severity,
    reason,
  };
}

// 문제 패널 — 인라인 힌트 + 검증 위반 묶음 (T032, FR-006)
describe("toProblems", () => {
  it("위반(fail)과 힌트(severity=hint)만 문제로 모은다", () => {
    const results = [
      cell("fail", "violation", "3.3.1", "외래어"),
      cell("pass", "violation", "2.1.4"),
      cell("na", "hint", "1.1.1", "참고"),
    ];
    const problems = toProblems(results);
    // fail + hint(na지만 severity hint) → 2건, pass 는 제외
    expect(problems).toHaveLength(2);
  });

  it("reason 을 메시지로 사용한다", () => {
    const [p] = toProblems([cell("fail", "violation", "3.3.1", "외래어 사용")]);
    expect(p.message).toContain("외래어 사용");
  });
});

describe("sortProblems", () => {
  it("위반(violation)을 힌트(hint)보다 먼저 정렬한다", () => {
    const problems = toProblems([
      cell("na", "hint", "1.1.1", "힌트"),
      cell("fail", "violation", "3.3.1", "위반"),
    ]);
    const sorted = sortProblems(problems);
    expect(sorted[0].severity).toBe("violation");
    expect(sorted[1].severity).toBe("hint");
  });
});
