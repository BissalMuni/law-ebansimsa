"use client";

import {
  CheckCircle2,
  CircleDot,
  Circle,
  Lock,
  Loader2,
  AlertCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type { StageStatus } from "@/lib/stages";
import { cn } from "@/lib/utils";

// 상태 3중 인코딩: 아이콘(기호) + 색 + 텍스트(aria-label·표시) (P5, P7, ui-spec §10.1)
const STATUS_META: Record<
  StageStatus,
  { Icon: LucideIcon; text: string; color: string }
> = {
  confirmed: { Icon: CheckCircle2, text: "확정 완료", color: "text-green-600 dark:text-green-400" },
  in_progress: { Icon: CircleDot, text: "작성 중", color: "text-primary" },
  validating: { Icon: Loader2, text: "검증 중", color: "text-amber-600 dark:text-amber-400" },
  available: { Icon: Circle, text: "진입 가능", color: "text-muted-foreground" },
  locked: { Icon: Lock, text: "잠김", color: "text-muted-foreground" },
  stale: { Icon: AlertCircle, text: "재검토 필요", color: "text-amber-600 dark:text-amber-400" },
  failed: { Icon: XCircle, text: "검증 실패", color: "text-destructive" },
};

export interface StageItemData {
  id: string;
  key: string;
  label: string;
  order: number;
  status: StageStatus;
}

export function StageItem({
  stage,
  isCurrent,
  onSelect,
}: {
  stage: StageItemData;
  isCurrent: boolean;
  onSelect: (id: string) => void;
}) {
  const meta = STATUS_META[stage.status];
  const locked = stage.status === "locked";
  const { Icon } = meta;

  return (
    <button
      type="button"
      role="link"
      aria-current={isCurrent ? "step" : undefined}
      aria-disabled={locked}
      aria-label={`${stage.order}. ${stage.label} — ${meta.text}`}
      disabled={locked}
      onClick={() => !locked && onSelect(stage.id)}
      className={cn(
        "flex h-10 w-full items-center gap-2 border-l-[3px] border-transparent pl-3 pr-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        locked
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-accent/60",
        isCurrent && "border-l-primary bg-accent",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-4 shrink-0",
          meta.color,
          stage.status === "validating" && "animate-spin",
        )}
      />
      <span className="font-medium text-foreground">
        {stage.order}. {stage.label}
      </span>
      {/* 텍스트 인코딩(스크린리더 외 시각적으로도) */}
      <span className="ml-auto text-[10px] text-muted-foreground">
        {meta.text}
      </span>
    </button>
  );
}
