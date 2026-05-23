"use client";

import { useState } from "react";

import { StageItem, type StageItemData } from "@/components/StageItem";

// Primary Sidebar 단계 뷰 (ui-spec §6.2) — 8단계 트리 + 진행률
export function StageSidebar({
  stages,
  initialStageId,
}: {
  stages: StageItemData[];
  initialStageId?: string;
}) {
  // 현재 작성 중(in_progress)·진입 가능(available) 단계를 기본 선택
  const fallback =
    stages.find((s) => s.status === "in_progress")?.id ??
    stages.find((s) => s.status === "available")?.id ??
    stages[0]?.id;
  const [currentId, setCurrentId] = useState<string | undefined>(
    initialStageId ?? fallback,
  );

  const total = stages.length || 1;
  const confirmed = stages.filter((s) => s.status === "confirmed").length;
  const pct = Math.round((confirmed / total) * 100);

  return (
    <div className="flex h-full flex-col">
      <nav
        role="navigation"
        aria-label="입안 단계"
        className="flex-1 overflow-y-auto py-2"
      >
        {stages.map((s) => (
          <StageItem
            key={s.id}
            stage={s}
            isCurrent={s.id === currentId}
            onSelect={setCurrentId}
          />
        ))}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="입안 진행률"
        >
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          진행 {pct}% ({confirmed}/{total})
        </p>
      </div>
    </div>
  );
}
