// @vitest-environment node
import { describe, expect, it } from "vitest";
import { toDraftReferences, type ReferenceLike } from "./references";

const refs: ReferenceLike[] = [
  {
    title: "서울 청년조례",
    municipality: "서울특별시",
    content: "제1조...",
    includedInContext: true,
  },
  {
    title: "부산 청년조례",
    municipality: "부산광역시",
    content: "제1조...",
    includedInContext: false,
  },
];

// 참고 조례 → /draft/generate references 매핑 (US7, P4 복제 금지는 api 가 강제)
describe("toDraftReferences", () => {
  it("AI 컨텍스트 포함(includedInContext)된 참고만 전달한다", () => {
    const out = toDraftReferences(refs);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("서울 청년조례");
  });

  it("title·content·municipality 를 매핑한다", () => {
    const out = toDraftReferences(refs);
    expect(out[0]).toEqual({
      title: "서울 청년조례",
      content: "제1조...",
      municipality: "서울특별시",
    });
  });

  it("포함된 참고가 없으면 빈 배열", () => {
    expect(toDraftReferences([refs[1]])).toHaveLength(0);
  });
});
