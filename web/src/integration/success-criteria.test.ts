// @vitest-environment node
// T040 통합 검증 — spec SC-001~006 을 핵심 로직 흐름으로 추적한다.
import { describe, expect, it } from "vitest";

import { buildSeedStages } from "@/lib/stages";
import {
  applyConfirm,
  applyEditConfirmed,
  canConfirm,
  type LockStage,
} from "@/lib/stage-lock";
import {
  allViolationsResolved,
  cellKey,
  getViolations,
  isMatrixComplete,
  type Resolution,
} from "@/lib/validation";
import { alignArticles, countChanges } from "@/lib/diff";
import { hasNoBasis } from "@/lib/chat";
import type { ValidationCellResult } from "@/lib/api-client";

// 시드 단계를 LockStage 로 (id=key)
function seededLockStages(): LockStage[] {
  return buildSeedStages().map((s) => ({
    id: s.key,
    order: s.order,
    status: s.status,
    required: s.required,
  }));
}

describe("SC-001 — 백지에서 8단계 완주", () => {
  it("표준 8단계를 순서대로 모두 확정할 수 있다", () => {
    let stages = seededLockStages();
    const order = [
      "title",
      "purpose",
      "definition",
      "scope",
      "main",
      "supplementary",
      "review",
      "finalize",
    ];
    for (const key of order) {
      expect(canConfirm(stages, key)).toBe(true); // 현재 단계는 확정 가능
      stages = applyConfirm(stages, key);
    }
    expect(stages.every((s) => s.status === "confirmed")).toBe(true);
  });
});

describe("SC-004 — 잠금 단계 우회 0건 (P2)", () => {
  it("이전 단계 미확정 시 다음 단계는 확정 불가", () => {
    const stages = seededLockStages();
    // 첫 단계만 가능, 3번째는 우회 불가
    expect(canConfirm(stages, "title")).toBe(true);
    expect(canConfirm(stages, "definition")).toBe(false);
  });

  it("확정 단계 수정 시 이후 확정 단계는 stale (FR-004)", () => {
    let stages = seededLockStages();
    stages = applyConfirm(stages, "title");
    stages = applyConfirm(stages, "purpose");
    stages = applyEditConfirmed(stages, "title");
    expect(stages.find((s) => s.id === "purpose")!.status).toBe("stale");
  });
});

describe("SC-003 — 매트릭스 전 셀 충족 (P3)", () => {
  const full: ValidationCellResult[] = [
    { article_id: "제1조", criterion_id: "2.1.4", source: "ebansimsa", verdict: "pass", severity: "violation" },
    { article_id: "제1조", criterion_id: "3.3.1", source: "ebansimsa", verdict: "fail", severity: "violation" },
  ];
  it("pending 없으면 완성", () => {
    expect(isMatrixComplete(full)).toBe(true);
  });
  it("pending 있으면 미완성", () => {
    expect(
      isMatrixComplete([
        ...full,
        { article_id: "제2조", criterion_id: "2.1.4", source: "ebansimsa", verdict: "pending", severity: "violation" },
      ]),
    ).toBe(false);
  });
});

describe("SC-006 — 검증 무시 100% 사유 기록 (P6)", () => {
  const violations: ValidationCellResult[] = [
    { article_id: "제1조", criterion_id: "3.3.1", source: "ebansimsa", verdict: "fail", severity: "violation" },
  ];
  it("사유 없는 무시는 미해결, 사유 있으면 해결", () => {
    const noReason: Record<string, Resolution> = {
      [cellKey("제1조", "3.3.1")]: { kind: "dismiss", reason: "" },
    };
    expect(allViolationsResolved(getViolations(violations), noReason)).toBe(false);
    const withReason: Record<string, Resolution> = {
      [cellKey("제1조", "3.3.1")]: { kind: "dismiss", reason: "의회 협의" },
    };
    expect(allViolationsResolved(getViolations(violations), withReason)).toBe(true);
  });
});

describe("SC-005 — 개정 변경 조 단위 시각화", () => {
  it("추가·수정·삭제를 조 단위로 정확히 센다", () => {
    const counts = countChanges(
      alignArticles(
        [
          { articleNo: 1, body: "원본1" },
          { articleNo: 2, body: "원본2" },
        ],
        [
          { articleNo: 1, body: "수정1" }, // modify
          { articleNo: 3, body: "신설3" }, // add (2 삭제)
        ],
      ),
    );
    expect(counts).toEqual({ added: 1, modified: 1, deleted: 1, unchanged: 0 });
  });
});

describe("SC-002 — 근거 없는 조문 표기 (P1/FR-005a)", () => {
  it("citations 가 비면 기준에 없음으로 표기 대상", () => {
    expect(hasNoBasis([])).toBe(true);
    expect(hasNoBasis(["2.1.4"])).toBe(false);
  });
});
