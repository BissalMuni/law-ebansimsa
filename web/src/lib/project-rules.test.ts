import { describe, expect, it } from "vitest";
import {
  PROJECT_KINDS,
  isProjectKind,
  isAmendmentKind,
  normalizeProjectInput,
} from "./project-rules";

// 프로젝트 입력 검증 — data-model §4 허용값(kind) + 필수 필드 (FR-001)
describe("project-rules", () => {
  it("허용 kind 는 data-model §4 와 일치한다", () => {
    expect(PROJECT_KINDS).toEqual(["enact", "amend_partial", "amend_full"]);
  });

  it("isProjectKind 는 허용값만 통과시킨다", () => {
    expect(isProjectKind("enact")).toBe(true);
    expect(isProjectKind("amend_full")).toBe(true);
    expect(isProjectKind("delete")).toBe(false);
    expect(isProjectKind("")).toBe(false);
  });

  it("isAmendmentKind 는 개정만 true", () => {
    expect(isAmendmentKind("enact")).toBe(false);
    expect(isAmendmentKind("amend_partial")).toBe(true);
    expect(isAmendmentKind("amend_full")).toBe(true);
  });

  it("제정은 시도+시군구를 지자체명으로 합성하고 trim 한다", () => {
    const out = normalizeProjectInput({
      kind: "enact",
      title: "  청년 창업 지원 조례  ",
      sido: " 서울특별시 ",
      sigungu: " 강남구 ",
    });
    expect(out).toEqual({
      kind: "enact",
      title: "청년 창업 지원 조례",
      municipality: "서울특별시 강남구",
      sourceUrl: null,
      originalContent: null,
    });
  });

  it("단층제(세종)는 시도만으로 지자체명이 된다", () => {
    const out = normalizeProjectInput({
      kind: "enact",
      title: "x",
      sido: "세종특별자치시",
    });
    expect(out.municipality).toBe("세종특별자치시");
  });

  it("개정은 원문과 출처를 보존한다", () => {
    const out = normalizeProjectInput({
      kind: "amend_partial",
      title: "기존 조례",
      sido: "서울특별시",
      sigungu: "강남구",
      sourceUrl: "  https://law.go.kr/ordin/123  ",
      originalContent: "제1조(목적) ...",
    });
    expect(out.sourceUrl).toBe("https://law.go.kr/ordin/123");
    expect(out.originalContent).toBe("제1조(목적) ...");
  });

  it("허용되지 않은 kind 는 거부한다", () => {
    expect(() =>
      normalizeProjectInput({ kind: "bogus", title: "x", sido: "서울특별시" }),
    ).toThrow();
  });

  it("제명(title)이 비면 거부한다", () => {
    expect(() =>
      normalizeProjectInput({ kind: "enact", title: "   ", sido: "서울특별시" }),
    ).toThrow();
  });

  it("시도가 비면 거부한다", () => {
    expect(() =>
      normalizeProjectInput({ kind: "enact", title: "x", sido: "" }),
    ).toThrow();
  });

  it("개정인데 원문이 없으면 거부한다", () => {
    expect(() =>
      normalizeProjectInput({
        kind: "amend_full",
        title: "x",
        sido: "서울특별시",
        sigungu: "강남구",
      }),
    ).toThrow(/원문/);
  });
});
