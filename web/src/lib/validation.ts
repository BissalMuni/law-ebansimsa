// 검증 결과 처리 — 순수 로직. 헌법 P3(전 셀 충족)·P6(무시 사유 강제).
import type { CriterionCell, ValidationCellResult } from "./api-client";

// 정밀 검증 기본 기준 셀 — 위키 기준 식별자(문자열 참조, data-model D1).
// 위키 기준 선택 UI(후속) 전까지 핵심 입안·정비 기준을 사용한다.
export const DEFAULT_CRITERIA: CriterionCell[] = [
  { criterion_id: "2.1.4", source: "ebansimsa", title: "정의규정 기준" },
  { criterion_id: "3.3.1", source: "ebansimsa", title: "용어 사용 기준" },
];

export interface Resolution {
  kind: "accept" | "dismiss";
  reason?: string;
}

// fail 판정 셀만 위반으로 추린다
export function getViolations(
  results: ValidationCellResult[],
): ValidationCellResult[] {
  return results.filter((r) => r.verdict === "fail");
}

// 셀(조문×기준) 식별 키
export function cellKey(articleId: string, criterionId: string): string {
  return `${articleId}::${criterionId}`;
}

// 무시 사유는 비어 있으면 안 된다 (헌법 P6)
export function isDismissReasonValid(reason: string | undefined): boolean {
  return !!reason && reason.trim().length > 0;
}

// 위반 1건이 해결되었는가 — 수용이거나, 사유 있는 무시 (P6)
export function isViolationResolved(
  violation: ValidationCellResult,
  resolutions: Record<string, Resolution>,
): boolean {
  const r = resolutions[cellKey(violation.article_id, violation.criterion_id)];
  if (!r) return false;
  if (r.kind === "accept") return true;
  return isDismissReasonValid(r.reason);
}

// 모든 위반이 해결되어야 단계 확정 가능
export function allViolationsResolved(
  violations: ValidationCellResult[],
  resolutions: Record<string, Resolution>,
): boolean {
  return violations.every((v) => isViolationResolved(v, resolutions));
}

// 매트릭스 전 셀이 판정(pending 없음)되었는가 (헌법 P3)
export function isMatrixComplete(results: ValidationCellResult[]): boolean {
  return results.length > 0 && results.every((r) => r.verdict !== "pending");
}
