// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  initialDraftState,
  applyDraftEvent,
  hasNoBasis,
} from "./chat";
import type { DraftEvent } from "./api-client";

// 채팅 SSE 누적 — citations 먼저, delta 누적, done 종료 (api-client DraftEvent 계약)
describe("applyDraftEvent", () => {
  it("citations 이벤트는 근거 배열을 설정한다 (P1)", () => {
    const s = applyDraftEvent(initialDraftState(), {
      type: "citations",
      citations: ["2.1.4", "3.3.1"],
    });
    expect(s.citations).toEqual(["2.1.4", "3.3.1"]);
  });

  it("delta 이벤트는 본문을 누적한다", () => {
    let s = initialDraftState();
    s = applyDraftEvent(s, { type: "delta", text: "제1조" });
    s = applyDraftEvent(s, { type: "delta", text: "(목적)" });
    expect(s.content).toBe("제1조(목적)");
    expect(s.done).toBe(false);
  });

  it("done 이벤트는 완료 플래그를 세운다", () => {
    const s = applyDraftEvent(initialDraftState(), { type: "done" });
    expect(s.done).toBe(true);
  });

  it("citations → delta 순서로 스트림을 재구성한다", () => {
    const events: DraftEvent[] = [
      { type: "citations", citations: ["2.1.4"] },
      { type: "delta", text: "가" },
      { type: "delta", text: "나" },
      { type: "done" },
    ];
    const s = events.reduce(applyDraftEvent, initialDraftState());
    expect(s).toEqual({ content: "가나", citations: ["2.1.4"], done: true });
  });
});

describe("hasNoBasis (FR-005a 기준에 없음)", () => {
  it("근거가 없으면 true", () => {
    expect(hasNoBasis([])).toBe(true);
  });
  it("근거가 있으면 false", () => {
    expect(hasNoBasis(["2.1.4"])).toBe(false);
  });
});
