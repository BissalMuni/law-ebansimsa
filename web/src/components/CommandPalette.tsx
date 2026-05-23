"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useUIStore } from "@/lib/store/ui-store";
import { filterCommands, type Command } from "@/lib/command";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// Command Palette (⌘P / ⌘⇧P) — 전역 명령 검색·실행 (US10, ui-spec §11)
export function CommandPalette() {
  const { togglePanel, toggleSplitView } = useUIStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: "toggle-primary",
        title: "보기: 사이드바 토글",
        keywords: ["panel", "stage", "left"],
        run: () => togglePanel("primarySidebar"),
      },
      {
        id: "toggle-secondary",
        title: "보기: AI 채팅 토글",
        keywords: ["chat", "right"],
        run: () => togglePanel("secondarySidebar"),
      },
      {
        id: "toggle-bottom",
        title: "보기: 하단 패널 토글",
        keywords: ["problems", "panel", "bottom"],
        run: () => togglePanel("bottomPanel"),
      },
      {
        id: "split",
        title: "에디터: 분할 보기 토글",
        keywords: ["split", "editor"],
        run: () => toggleSplitView(),
      },
    ],
    [togglePanel, toggleSplitView],
  );

  const filtered = filterCommands(commands, query);

  // ⌘P / ⌘⇧P 로 열기 (ui-spec §11). 입력 중 기본 동작 막음.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setActive(0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function run(cmd: Command) {
    cmd.run();
    setOpen(false);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && filtered[active]) {
      e.preventDefault();
      run(filtered[active]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[20%] max-w-lg translate-y-0 gap-0 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>명령 팔레트</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          aria-label="명령 검색"
          value={query}
          placeholder="명령 입력… (예: 채팅, 분할)"
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onInputKeyDown}
          className="border-0 border-b border-border focus-visible:ring-0"
        />
        <ul ref={listRef} role="listbox" aria-label="명령 목록" className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              일치하는 명령이 없습니다.
            </li>
          )}
          {filtered.map((cmd, i) => (
            <li key={cmd.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => run(cmd)}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm",
                  i === active ? "bg-accent text-accent-foreground" : "",
                )}
              >
                {cmd.title}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
