"use server";

import { prisma } from "@/lib/db";

// 검증 결과 영속 — 매트릭스 셀(조문×기준) 단위 (P3). 무시 사유 기록 (P6).
export interface ValidationCellRecord {
  sectionId: string;
  criterionId: string;
  source: "ebansimsa" | "jungbigijun";
  verdict: "pass" | "fail" | "na" | "pending";
  severity?: "hint" | "violation";
  reason?: string | null;
  suggestion?: string | null;
  dismissedReason?: string | null;
}

// 매트릭스 결과를 ValidationResult 로 저장. 재검증 시 기존 셀은 교체.
export async function persistValidationCells(cells: ValidationCellRecord[]) {
  if (cells.length === 0) return;
  const sectionIds = [...new Set(cells.map((c) => c.sectionId))];
  await prisma.$transaction([
    // 같은 조문의 이전 검증 결과 정리 후 재기록 (파생물 비영속 정신, 최신만 유지)
    prisma.validationResult.deleteMany({ where: { sectionId: { in: sectionIds } } }),
    prisma.validationResult.createMany({
      data: cells.map((c) => ({
        sectionId: c.sectionId,
        criterionId: c.criterionId,
        source: c.source,
        verdict: c.verdict,
        severity: c.severity ?? null,
        reason: c.reason ?? null,
        suggestion: c.suggestion ?? null,
        dismissedReason: c.dismissedReason ?? null,
      })),
    }),
  ]);
}
