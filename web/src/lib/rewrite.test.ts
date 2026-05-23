// @vitest-environment node
import { describe, expect, it } from "vitest";
import { REWRITE_ACTIONS, buildRewriteIntent } from "./rewrite";

// 부유 툴바 AI 재작성 의도 — 선택 조문을 톤/길이로 변환 (ui-spec §부유 액션)
describe("buildRewriteIntent", () => {
  it("세 가지 액션이 정의되어 있다 (다른 톤·짧게·길게)", () => {
    expect(REWRITE_ACTIONS.map((a) => a.kind)).toEqual(["tone", "short", "long"]);
  });

  it("선택 텍스트를 의도 프롬프트에 포함한다", () => {
    const intent = buildRewriteIntent("short", "제1조 목적 ...");
    expect(intent).toContain("제1조 목적 ...");
  });

  it("액션별로 다른 지시문을 만든다", () => {
    const text = "본문";
    const tone = buildRewriteIntent("tone", text);
    const short = buildRewriteIntent("short", text);
    const long = buildRewriteIntent("long", text);
    expect(tone).not.toBe(short);
    expect(short).not.toBe(long);
  });
});
