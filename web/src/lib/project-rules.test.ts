import { describe, expect, it } from "vitest";
import {
  PROJECT_KINDS,
  isProjectKind,
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

  it("normalizeProjectInput 은 공백을 trim 하고 정상 입력을 반환한다", () => {
    const out = normalizeProjectInput({
      kind: "enact",
      title: "  청년 창업 지원 조례  ",
      municipality: " 서울특별시 ",
    });
    expect(out).toEqual({
      kind: "enact",
      title: "청년 창업 지원 조례",
      municipality: "서울특별시",
    });
  });

  it("허용되지 않은 kind 는 거부한다", () => {
    expect(() =>
      normalizeProjectInput({
        kind: "bogus",
        title: "x",
        municipality: "y",
      }),
    ).toThrow();
  });

  it("제명(title)이 비면 거부한다", () => {
    expect(() =>
      normalizeProjectInput({ kind: "enact", title: "   ", municipality: "y" }),
    ).toThrow();
  });

  it("지자체명(municipality)이 비면 거부한다", () => {
    expect(() =>
      normalizeProjectInput({ kind: "enact", title: "x", municipality: "" }),
    ).toThrow();
  });
});
