"use client";

import { Sparkles } from "lucide-react";

import { REWRITE_ACTIONS, type RewriteKind } from "@/lib/rewrite";
import { Button } from "@/components/ui/button";

// 텍스트 선택 시 나타나는 부유 액션 툴바 (ui-spec §부유 액션). 위치는 선택 영역 상단.
export function FloatingToolbar({
  top,
  left,
  busy,
  onAction,
}: {
  top: number;
  left: number;
  busy: boolean;
  onAction: (kind: RewriteKind) => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="선택 영역 AI 액션"
      style={{ top, left }}
      className="absolute z-20 flex -translate-y-full items-center gap-1 rounded-md border border-border bg-popover p-1 shadow-md"
    >
      <Sparkles className="ml-1 size-3.5 text-primary" aria-hidden />
      {REWRITE_ACTIONS.map((a) => (
        <Button
          key={a.kind}
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          disabled={busy}
          onClick={() => onAction(a.kind)}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
