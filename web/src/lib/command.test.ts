// @vitest-environment node
import { describe, expect, it } from "vitest";
import { filterCommands, type Command } from "./command";

const cmds: Command[] = [
  { id: "toggle-sidebar", title: "사이드바 토글", keywords: ["panel", "left"], run: () => {} },
  { id: "toggle-chat", title: "AI 채팅 토글", keywords: ["chat", "right"], run: () => {} },
  { id: "split", title: "에디터 분할", keywords: ["editor"], run: () => {} },
];

describe("filterCommands", () => {
  it("빈 질의는 전체를 반환한다", () => {
    expect(filterCommands(cmds, "")).toHaveLength(3);
    expect(filterCommands(cmds, "   ")).toHaveLength(3);
  });

  it("제목으로 부분 일치 검색한다 (대소문자 무시)", () => {
    const r = filterCommands(cmds, "채팅");
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("toggle-chat");
  });

  it("키워드로도 매칭한다", () => {
    const r = filterCommands(cmds, "editor");
    expect(r.map((c) => c.id)).toContain("split");
  });

  it("매칭이 없으면 빈 배열", () => {
    expect(filterCommands(cmds, "zzz")).toHaveLength(0);
  });

  it("영문 대소문자를 구분하지 않는다", () => {
    expect(filterCommands(cmds, "CHAT")).toHaveLength(1);
  });
});
