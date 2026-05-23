// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  MAIN_SUBSTAGE_CANDIDATES,
  buildSubStages,
} from "./substages";

// 본칙 동적 sub-stage 구성 (US5, data-model §4.1 self-relation)
describe("buildSubStages", () => {
  it("선택한 항목만 sub-stage 로 만든다", () => {
    const ids = [MAIN_SUBSTAGE_CANDIDATES[0].id, MAIN_SUBSTAGE_CANDIDATES[2].id];
    const subs = buildSubStages(ids, "main-stage-id");
    expect(subs).toHaveLength(2);
    expect(subs.map((s) => s.label)).toEqual([
      MAIN_SUBSTAGE_CANDIDATES[0].label,
      MAIN_SUBSTAGE_CANDIDATES[2].label,
    ]);
  });

  it("각 sub-stage 는 parentId 와 고유 key 를 갖는다", () => {
    const ids = MAIN_SUBSTAGE_CANDIDATES.slice(0, 2).map((c) => c.id);
    const subs = buildSubStages(ids, "parent-1");
    expect(subs.every((s) => s.parentId === "parent-1")).toBe(true);
    const keys = subs.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length); // 중복 없음
  });

  it("sub-stage 는 1부터 순서가 매겨지고 모두 진입 가능(available)·필수다", () => {
    const ids = MAIN_SUBSTAGE_CANDIDATES.slice(0, 3).map((c) => c.id);
    const subs = buildSubStages(ids, "p");
    expect(subs.map((s) => s.order)).toEqual([1, 2, 3]);
    expect(subs.every((s) => s.status === "available")).toBe(true);
    expect(subs.every((s) => s.required)).toBe(true);
  });

  it("알 수 없는 id 는 무시한다", () => {
    const subs = buildSubStages(["__nope__"], "p");
    expect(subs).toHaveLength(0);
  });
});
