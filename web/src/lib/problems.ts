// 문제 패널 로직 — 인라인 힌트·검증 위반을 문제 항목으로 (T032, FR-006). 순수.
import type { ValidationCellResult } from "./api-client";

export interface Problem {
  articleId: string;
  criterionId: string;
  severity: "hint" | "violation";
  message: string;
}

// fail 판정이거나 hint 심각도인 셀만 문제로 추린다
export function toProblems(results: ValidationCellResult[]): Problem[] {
  return results
    .filter((r) => r.verdict === "fail" || r.severity === "hint")
    .map((r) => ({
      articleId: r.article_id,
      criterionId: r.criterion_id,
      severity: r.severity,
      message: r.reason ?? `§${r.criterion_id} 점검 필요`,
    }));
}

function rank(severity: Problem["severity"]): number {
  return severity === "violation" ? 0 : 1;
}

// 위반 우선, 그다음 기준 식별자 순
export function sortProblems(problems: Problem[]): Problem[] {
  return [...problems].sort(
    (a, b) =>
      rank(a.severity) - rank(b.severity) ||
      a.criterionId.localeCompare(b.criterionId),
  );
}
