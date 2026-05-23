// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolveInitialTheme, toggleTheme } from "./theme";

// 다크/라이트 테마 결정 로직 (T038, constitution §IV)
describe("resolveInitialTheme", () => {
  it("저장된 값이 있으면 그대로 쓴다", () => {
    expect(resolveInitialTheme("dark", false)).toBe("dark");
    expect(resolveInitialTheme("light", true)).toBe("light");
  });

  it("저장값이 없으면 OS 선호를 따른다", () => {
    expect(resolveInitialTheme(null, true)).toBe("dark");
    expect(resolveInitialTheme(null, false)).toBe("light");
  });

  it("잘못된 저장값은 OS 선호로 대체한다", () => {
    expect(resolveInitialTheme("bogus", true)).toBe("dark");
  });
});

describe("toggleTheme", () => {
  it("light↔dark 를 뒤집는다", () => {
    expect(toggleTheme("light")).toBe("dark");
    expect(toggleTheme("dark")).toBe("light");
  });
});
