"use client";

import {
  ListTree,
  BookOpen,
  Search,
  History,
  Landmark,
  AlertTriangle,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";

// Activity Bar (48px) — Primary Sidebar 뷰 전환 (ui-spec §6.1)
export type ActivityView =
  | "stages"
  | "wiki"
  | "search"
  | "history"
  | "references"
  | "problems"
  | "settings";

const ITEMS: { view: ActivityView; label: string; Icon: typeof ListTree }[] = [
  { view: "stages", label: "단계", Icon: ListTree },
  { view: "wiki", label: "위키", Icon: BookOpen },
  { view: "search", label: "검색", Icon: Search },
  { view: "history", label: "이력", Icon: History },
  { view: "references", label: "타 지자체", Icon: Landmark },
  { view: "problems", label: "문제", Icon: AlertTriangle },
  { view: "settings", label: "설정", Icon: Settings },
];

export function ActivityBar({
  active,
  onSelect,
}: {
  active: ActivityView;
  onSelect: (view: ActivityView) => void;
}) {
  return (
    <nav
      aria-label="작업 영역 전환"
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-secondary py-2"
    >
      {ITEMS.map(({ view, label, Icon }) => {
        const isActive = active === view;
        return (
          <button
            key={view}
            type="button"
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            onClick={() => onSelect(view)}
            className={cn(
              "flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive && "bg-accent text-primary",
            )}
          >
            <Icon aria-hidden className="size-5" />
          </button>
        );
      })}
    </nav>
  );
}
