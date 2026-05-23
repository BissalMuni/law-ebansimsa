// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  getViolations,
  cellKey,
  isDismissReasonValid,
  isViolationResolved,
  allViolationsResolved,
  isMatrixComplete,
  type Resolution,
} from "./validation";
import type { ValidationCellResult } from "./api-client";

function cell(
  article_id: string,
  criterion_id: string,
  verdict: ValidationCellResult["verdict"],
): ValidationCellResult {
  return {
    article_id,
    criterion_id,
    source: "ebansimsa",
    verdict,
    severity: "violation",
  };
}

describe("getViolations", () => {
  it("verdict 가 fail 인 셀만 위반으로 모은다", () => {
    const results = [cell("a1", "3.3.1", "fail"), cell("a1", "2.1.4", "pass")];
    expect(getViolations(results)).toHaveLength(1);
    expect(getViolations(results)[0].criterion_id).toBe("3.3.1");
  });
});

describe("isDismissReasonValid (P6 사유 강제)", () => {
  it("빈 사유는 무효", () => {
    expect(isDismissReasonValid("")).toBe(false);
    expect(isDismissReasonValid("   ")).toBe(false);
  });
  it("내용 있는 사유는 유효", () => {
    expect(isDismissReasonValid("의회 협의로 예외 인정")).toBe(true);
  });
});

describe("isViolationResolved", () => {
  const v = cell("a1", "3.3.1", "fail");
  it("수용(accept)이면 해결", () => {
    const res: Record<string, Resolution> = {
      [cellKey("a1", "3.3.1")]: { kind: "accept" },
    };
    expect(isViolationResolved(v, res)).toBe(true);
  });
  it("무시(dismiss)는 사유가 있어야 해결 (P6)", () => {
    const noReason: Record<string, Resolution> = {
      [cellKey("a1", "3.3.1")]: { kind: "dismiss", reason: "" },
    };
    expect(isViolationResolved(v, noReason)).toBe(false);
    const withReason: Record<string, Resolution> = {
      [cellKey("a1", "3.3.1")]: { kind: "dismiss", reason: "사유 있음" },
    };
    expect(isViolationResolved(v, withReason)).toBe(true);
  });
  it("미해결(resolution 없음)이면 false", () => {
    expect(isViolationResolved(v, {})).toBe(false);
  });
});

describe("allViolationsResolved", () => {
  it("모든 위반이 해결되어야 true", () => {
    const violations = [cell("a1", "3.3.1", "fail"), cell("a2", "2.1.4", "fail")];
    const partial: Record<string, Resolution> = {
      [cellKey("a1", "3.3.1")]: { kind: "accept" },
    };
    expect(allViolationsResolved(violations, partial)).toBe(false);
    const full: Record<string, Resolution> = {
      ...partial,
      [cellKey("a2", "2.1.4")]: { kind: "dismiss", reason: "예외" },
    };
    expect(allViolationsResolved(violations, full)).toBe(true);
  });

  it("위반이 없으면 항상 true", () => {
    expect(allViolationsResolved([], {})).toBe(true);
  });
});

describe("isMatrixComplete (P3 전 셀 충족)", () => {
  it("pending 셀이 하나라도 있으면 미완성", () => {
    const results = [cell("a1", "3.3.1", "pass"), cell("a1", "2.1.4", "pending")];
    expect(isMatrixComplete(results)).toBe(false);
  });
  it("모든 셀이 판정되면 완성", () => {
    const results = [cell("a1", "3.3.1", "pass"), cell("a1", "2.1.4", "fail")];
    expect(isMatrixComplete(results)).toBe(true);
  });
});
