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
import { STATUS_ENCODING } from "@/lib/encoding";
import { cn } from "@/lib/utils";

// 상태 3중 인코딩: 아이콘(기호) + 색 + 텍스트 (P5, P7). 텍스트는 STATUS_ENCODING 단일 출처.
const STATUS_META: Record<StageStatus, { Icon: LucideIcon; color: string }> = {
  confirmed: { Icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
  in_progress: { Icon: CircleDot, color: "text-primary" },
  validating: { Icon: Loader2, color: "text-amber-600 dark:text-amber-400" },
  available: { Icon: Circle, color: "text-muted-foreground" },
  locked: { Icon: Lock, color: "text-muted-foreground" },
  stale: { Icon: AlertCircle, color: "text-amber-600 dark:text-amber-400" },
  failed: { Icon: XCircle, color: "text-destructive" },
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
  const statusText = STATUS_ENCODING[stage.status].text;
  const locked = stage.status === "locked";
  const { Icon } = meta;

  return (
    <button
      type="button"
      role="link"
      aria-current={isCurrent ? "step" : undefined}
      aria-disabled={locked}
      aria-label={`${stage.order}. ${stage.label} — ${statusText}`}
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
        {statusText}
      </span>
    </button>
  );
}
