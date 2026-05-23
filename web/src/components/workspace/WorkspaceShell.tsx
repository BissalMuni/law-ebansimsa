"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PanelLeft, PanelRight, PanelBottom } from "lucide-react";

import { useUIStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ActivityBar, type ActivityView } from "./ActivityBar";
import { CommandPalette } from "@/components/CommandPalette";

export interface WorkspaceProject {
  id: string;
  title: string;
  kind: string;
  municipality: string;
  progress: number;
}

const KIND_LABEL: Record<string, string> = {
  enact: "제정",
  amend_partial: "일부개정",
  amend_full: "전부개정",
};

// VS Code 6대 영역 셸 (ui-spec §6). 영역 내용은 후속 task(StageItem·Editor·Chat)에서 주입.
export function WorkspaceShell({
  project,
  stageSidebar,
  editor,
  chat,
  bottomPanel,
}: {
  project: WorkspaceProject;
  stageSidebar?: ReactNode;
  editor?: ReactNode;
  chat?: ReactNode;
  bottomPanel?: ReactNode;
}) {
  const {
    primarySidebarOpen,
    secondarySidebarOpen,
    bottomPanelOpen,
    togglePanel,
  } = useUIStore();
  const [activeView, setActiveView] = useState<ActivityView>("stages");

  // 패널 토글 단축키 — ⌘B / ⌘⌥B / ⌘J (ui-spec §7 단축키)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === "b" && e.altKey) {
        e.preventDefault();
        togglePanel("secondarySidebar");
      } else if (key === "b") {
        e.preventDefault();
        togglePanel("primarySidebar");
      } else if (key === "j") {
        e.preventDefault();
        togglePanel("bottomPanel");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePanel]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <CommandPalette />
      <div className="flex min-h-0 flex-1">
        <ActivityBar active={activeView} onSelect={setActiveView} />

        {/* Primary Sidebar (240px) — 단계 트리 등 */}
        {primarySidebarOpen && (
          <aside
            aria-label="입안 단계"
            className="flex w-60 shrink-0 flex-col border-r border-border bg-card"
          >
            {stageSidebar ?? (
              <div className="p-3 text-sm text-muted-foreground">
                {activeView} 뷰
              </div>
            )}
          </aside>
        )}

        {/* Editor Group (중앙, 가변) + Bottom Panel */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col">
            {editor ?? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                에디터 영역
              </div>
            )}
          </div>
          {bottomPanelOpen && (
            <section
              aria-label="문제·이력·출력"
              className="h-48 shrink-0 overflow-auto border-t border-border bg-card"
            >
              {bottomPanel ?? (
                <div className="p-3 text-sm text-muted-foreground">
                  문제 · 이력 · 출력
                </div>
              )}
            </section>
          )}
        </main>

        {/* Secondary Sidebar (380px) — AI 채팅 */}
        {secondarySidebarOpen && (
          <aside
            aria-label="AI 채팅"
            className="flex w-[380px] shrink-0 flex-col border-l border-border bg-card"
          >
            {chat ?? (
              <div className="p-3 text-sm text-muted-foreground">AI 채팅</div>
            )}
          </aside>
        )}
      </div>

      {/* Status Bar (24px) */}
      <footer className="flex h-6 shrink-0 items-center gap-3 border-t border-border bg-primary px-3 text-xs text-primary-foreground">
        <span>📂 {project.title}</span>
        <span aria-hidden>·</span>
        <span>종류: {KIND_LABEL[project.kind] ?? project.kind}</span>
        <span aria-hidden>·</span>
        <span>{project.municipality}</span>
        <span aria-hidden>·</span>
        <span>진행 {project.progress}%</span>

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="좌측 사이드바 토글"
            aria-pressed={primarySidebarOpen}
            onClick={() => togglePanel("primarySidebar")}
            className={cn(
              "size-5 text-primary-foreground hover:bg-primary-foreground/20",
              !primarySidebarOpen && "opacity-50",
            )}
          >
            <PanelLeft className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="하단 패널 토글"
            aria-pressed={bottomPanelOpen}
            onClick={() => togglePanel("bottomPanel")}
            className={cn(
              "size-5 text-primary-foreground hover:bg-primary-foreground/20",
              !bottomPanelOpen && "opacity-50",
            )}
          >
            <PanelBottom className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="우측 사이드바 토글"
            aria-pressed={secondarySidebarOpen}
            onClick={() => togglePanel("secondarySidebar")}
            className={cn(
              "size-5 text-primary-foreground hover:bg-primary-foreground/20",
              !secondarySidebarOpen && "opacity-50",
            )}
          >
            <PanelRight className="size-3.5" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
