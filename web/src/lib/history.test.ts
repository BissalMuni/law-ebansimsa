// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  TRIGGER_LABELS,
  snapshotTitle,
  sortByRecent,
  snapshotToText,
  type SnapshotLike,
} from "./history";

function snap(over: Partial<SnapshotLike>): SnapshotLike {
  return {
    id: "s1",
    trigger: "confirm",
    actor: "user",
    label: null,
    content: [],
    createdAt: new Date("2026-05-23T10:00:00Z"),
    ...over,
  };
}

// 이력·시간여행 (US8) — Snapshot 타임라인
describe("snapshotTitle", () => {
  it("label 이 있으면 label 을 쓴다", () => {
    expect(snapshotTitle(snap({ label: "확정 → 통과" }))).toBe("확정 → 통과");
  });
  it("label 이 없으면 trigger 한글명을 쓴다", () => {
    expect(snapshotTitle(snap({ trigger: "ai_apply", label: null }))).toBe(
      TRIGGER_LABELS.ai_apply,
    );
  });
});

describe("sortByRecent", () => {
  it("최신순으로 정렬한다", () => {
    const a = snap({ id: "a", createdAt: new Date("2026-05-23T09:00:00Z") });
    const b = snap({ id: "b", createdAt: new Date("2026-05-23T11:00:00Z") });
    expect(sortByRecent([a, b]).map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("snapshotToText (시간여행 본문 복원)", () => {
  it("조 배열을 텍스트로 합친다", () => {
    const text = snapshotToText(
      snap({ content: [{ articleNo: 1, body: "제1조 본문" }, { articleNo: 2, body: "제2조 본문" }] }),
    );
    expect(text).toContain("제1조 본문");
    expect(text).toContain("제2조 본문");
  });
});
