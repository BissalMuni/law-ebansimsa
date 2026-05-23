"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import {
  THEME_STORAGE_KEY,
  resolveInitialTheme,
  toggleTheme,
  type Theme,
} from "@/lib/theme";
import { Button } from "@/components/ui/button";

// 라이트/다크 토글 (T038) — .dark 클래스 + localStorage 영속
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setTheme(resolveInitialTheme(stored, prefersDark));
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      onClick={() => apply(toggleTheme(theme))}
      className={className}
    >
      {theme === "dark" ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </Button>
  );
}
