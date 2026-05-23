import { describe, expect, it } from "vitest";
import {
  STANDARD_STAGES,
  STAGE_KEYS,
  buildSeedStages,
  type StageStatus,
} from "./stages";

// 표준 8단계 정의·시드 — data-model §4.1 단일 출처, 헌법 P2
describe("standard stages", () => {
  it("표준 8단계 키·순서가 data-model §4.1 과 정확히 일치한다", () => {
    expect(STAGE_KEYS).toEqual([
      "title",
      "purpose",
      "definition",
      "scope",
      "main",
      "supplementary",
      "review",
      "finalize",
    ]);
  });

  it("각 단계는 한글 라벨과 1부터 시작하는 순서를 갖는다", () => {
    expect(STANDARD_STAGES).toHaveLength(8);
    expect(STANDARD_STAGES[0]).toMatchObject({
      key: "title",
      label: "제명",
      order: 1,
    });
    expect(STANDARD_STAGES[5]).toMatchObject({
      key: "supplementary",
      label: "부칙",
      order: 6,
    });
    const orders = STANDARD_STAGES.map((s) => s.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("buildSeedStages: 첫 단계만 available, 나머지는 locked (P2 선형 잠금)", () => {
    const seed = buildSeedStages();
    expect(seed).toHaveLength(8);
    expect(seed[0].status).toBe<StageStatus>("available");
    for (const s of seed.slice(1)) {
      expect(s.status).toBe<StageStatus>("locked");
    }
  });

  it("buildSeedStages: 모든 단계가 required 이고 8단계 모두 포함한다", () => {
    const seed = buildSeedStages();
    expect(seed.every((s) => s.required)).toBe(true);
    expect(seed.map((s) => s.key)).toEqual(STAGE_KEYS);
  });
});
