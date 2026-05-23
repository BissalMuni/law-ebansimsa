// 검토 매트릭스 인덱싱 (Stage 7) — 조문×기준 셀 조회. 순수.
import { cellKey } from "./validation";
import type { ValidationCellResult } from "./api-client";

export type MatrixIndex = Map<string, ValidationCellResult>;

export function buildMatrixIndex(results: ValidationCellResult[]): MatrixIndex {
  const idx: MatrixIndex = new Map();
  for (const r of results) idx.set(cellKey(r.article_id, r.criterion_id), r);
  return idx;
}

// 셀의 verdict — 결과 없으면 pending(미충족, P3)
export function verdictAt(
  idx: MatrixIndex,
  articleId: string,
  criterionId: string,
): ValidationCellResult["verdict"] {
  return idx.get(cellKey(articleId, criterionId))?.verdict ?? "pending";
}
