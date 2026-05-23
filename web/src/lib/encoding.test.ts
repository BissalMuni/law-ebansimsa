// @vitest-environment node
import { describe, expect, it } from "vitest";
import { STATUS_ENCODING, VERDICT_ENCODING } from "./encoding";
import { STAGE_KEYS } from "./stages";

// P5 — 3중 인코딩(색·기호·텍스트). 색 외에 기호·텍스트로도 정보를 전달해야 한다.
const STAGE_STATUSES = [
  "locked",
  "available",
  "in_progress",
  "validating",
  "confirmed",
  "stale",
  "failed",
] as const;
const VERDICTS = ["pass", "fail", "na", "pending"] as const;

describe("STATUS_ENCODING (P5)", () => {
  it("모든 단계 상태에 텍스트와 기호가 있다 (색 단독 금지)", () => {
    for (const s of STAGE_STATUSES) {
      expect(STATUS_ENCODING[s].text.length).toBeGreaterThan(0);
      expect(STATUS_ENCODING[s].symbol.length).toBeGreaterThan(0);
    }
  });
});

describe("VERDICT_ENCODING (P5)", () => {
  it("모든 verdict 에 텍스트와 기호가 있다", () => {
    for (const v of VERDICTS) {
      expect(VERDICT_ENCODING[v].text.length).toBeGreaterThan(0);
      expect(VERDICT_ENCODING[v].symbol.length).toBeGreaterThan(0);
    }
  });
});

it("표준 8단계 키는 변함없이 8개다 (회귀 가드)", () => {
  expect(STAGE_KEYS).toHaveLength(8);
});
