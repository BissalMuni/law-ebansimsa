// 테마 결정 — 순수 로직 (T038). 라이트/다크 (constitution §IV)
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "law-ebansimsa-theme";

// 저장값 우선, 없거나 잘못되면 OS 선호(prefers-color-scheme)를 따른다
export function resolveInitialTheme(
  stored: string | null,
  prefersDark: boolean,
): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

export function toggleTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}
