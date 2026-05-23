// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  canEnter,
  canConfirm,
  applyConfirm,
  applyEditConfirmed,
  type LockStage,
} from "./stage-lock";

// 단계 잠금 로직 — 헌법 P2(우회 불가) + FR-004(확정 수정 시 이후 stale)
// 헬퍼: order 와 status 만으로 단계 배열 구성
function mk(statuses: LockStage["status"][]): LockStage[] {
  return statuses.map((status, i) => ({
    id: `s${i + 1}`,
    order: i + 1,
    status,
    required: true,
  }));
}

describe("canEnter (P2 선형 잠금)", () => {
  it("첫 단계는 항상 진입 가능", () => {
    const stages = mk(["available", "locked", "locked"]);
    expect(canEnter(stages, 1)).toBe(true);
  });

  it("이전 단계가 confirmed 가 아니면 진입 불가", () => {
    const stages = mk(["in_progress", "locked", "locked"]);
    expect(canEnter(stages, 2)).toBe(false);
  });

  it("이전 단계가 모두 confirmed 면 진입 가능", () => {
    const stages = mk(["confirmed", "confirmed", "locked"]);
    expect(canEnter(stages, 3)).toBe(true);
  });

  it("중간 단계 하나라도 미확정이면 그 뒤로 진입 불가", () => {
    const stages = mk(["confirmed", "in_progress", "locked", "locked"]);
    expect(canEnter(stages, 3)).toBe(false);
  });

  it("필수 아님(required=false)인 이전 단계는 잠금 판단에서 제외", () => {
    const stages: LockStage[] = [
      { id: "a", order: 1, status: "confirmed", required: true },
      { id: "b", order: 2, status: "available", required: false },
      { id: "c", order: 3, status: "locked", required: true },
    ];
    expect(canEnter(stages, 3)).toBe(true);
  });
});

describe("canConfirm", () => {
  it("진입 가능하고 잠기지 않은 단계만 확정할 수 있다", () => {
    const stages = mk(["confirmed", "in_progress", "locked"]);
    expect(canConfirm(stages, "s2")).toBe(true);
    expect(canConfirm(stages, "s3")).toBe(false); // 잠긴 단계 우회 금지
  });
});

describe("applyConfirm", () => {
  it("확정 시 해당 단계는 confirmed, 다음 잠금 단계는 available 로 열린다", () => {
    const stages = mk(["confirmed", "in_progress", "locked", "locked"]);
    const next = applyConfirm(stages, "s2");
    expect(next.find((s) => s.id === "s2")!.status).toBe("confirmed");
    expect(next.find((s) => s.id === "s3")!.status).toBe("available");
    expect(next.find((s) => s.id === "s4")!.status).toBe("locked");
  });

  it("마지막 단계 확정 시에도 오류 없이 동작한다", () => {
    const stages = mk(["confirmed", "confirmed", "in_progress"]);
    const next = applyConfirm(stages, "s3");
    expect(next.find((s) => s.id === "s3")!.status).toBe("confirmed");
  });

  it("잠긴 단계는 확정해도 변하지 않는다 (우회 불가, P2)", () => {
    const stages = mk(["confirmed", "locked", "locked"]);
    const next = applyConfirm(stages, "s3");
    expect(next).toEqual(stages);
  });
});

describe("applyEditConfirmed (FR-004 stale 전파)", () => {
  it("확정 단계를 수정하면 그 단계는 in_progress, 이후 confirmed 단계는 stale", () => {
    const stages = mk(["confirmed", "confirmed", "confirmed", "available"]);
    const next = applyEditConfirmed(stages, "s2");
    expect(next.find((s) => s.id === "s1")!.status).toBe("confirmed"); // 이전은 유지
    expect(next.find((s) => s.id === "s2")!.status).toBe("in_progress");
    expect(next.find((s) => s.id === "s3")!.status).toBe("stale");
    const s3 = next.find((s) => s.id === "s3")!;
    expect(s3.staleReason).toBeTruthy();
  });

  it("이후에 확정 단계가 없으면 수정 단계만 in_progress 가 된다", () => {
    const stages = mk(["confirmed", "confirmed", "available", "locked"]);
    const next = applyEditConfirmed(stages, "s2");
    expect(next.find((s) => s.id === "s3")!.status).toBe("available");
    expect(next.find((s) => s.id === "s4")!.status).toBe("locked");
  });

  it("확정 상태가 아닌 단계 수정 요청은 변화 없음", () => {
    const stages = mk(["confirmed", "in_progress", "locked"]);
    const next = applyEditConfirmed(stages, "s2");
    expect(next).toEqual(stages);
  });
});
