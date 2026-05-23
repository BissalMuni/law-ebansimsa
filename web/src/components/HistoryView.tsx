"use client";

import { useEffect, useState } from "react";
import { Bot, User, Clock } from "lucide-react";

import { listSnapshots } from "@/server/snapshots";
import { useEditorStore } from "@/lib/store/editor-store";
import { useUIStore } from "@/lib/store/ui-store";
import {
  snapshotTitle,
  snapshotToText,
  sortByRecent,
  type SnapshotArticle,
  type SnapshotLike,
} from "@/lib/history";

// 이력·시간여행 (US8, ui-spec §6.5 이력 탭) — Snapshot 타임라인
export function HistoryView({ projectId }: { projectId: string }) {
  const [snaps, setSnaps] = useState<SnapshotLike[]>([]);
  const upsertDocument = useEditorStore((s) => s.upsertDocument);
  const openTab = useUIStore((s) => s.openTab);

  useEffect(() => {
    listSnapshots(projectId)
      .then((rows) =>
        setSnaps(
          rows.map((r) => ({
            id: r.id,
            trigger: r.trigger as SnapshotLike["trigger"],
            actor: r.actor as SnapshotLike["actor"],
            label: r.label,
            content: (r.content as unknown as SnapshotArticle[]) ?? [],
            createdAt: r.createdAt,
          })),
        ),
      )
      .catch(() => {});
  }, [projectId]);

  // 특정 시점 스냅샷을 읽기 전용 탭으로 열기 (시간여행)
  function openSnapshot(s: SnapshotLike) {
    const docId = `snap-${s.id}`;
    upsertDocument({
      id: docId,
      title: `이력: ${snapshotTitle(s)}`,
      value: snapshotToText(s),
      readOnly: true,
    });
    openTab({ id: docId, title: `이력: ${snapshotTitle(s)}` });
  }

  if (snaps.length === 0) {
    return <p className="p-3 text-sm text-muted-foreground">아직 이력이 없습니다.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {sortByRecent(snaps).map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => openSnapshot(s)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex-1">{snapshotTitle(s)}</span>
            {s.actor === "ai" ? (
              <Bot className="size-3.5 text-primary" aria-hidden />
            ) : (
              <User className="size-3.5 text-muted-foreground" aria-hidden />
            )}
            <time className="text-xs text-muted-foreground">
              {s.createdAt.toLocaleString("ko-KR")}
            </time>
          </button>
        </li>
      ))}
    </ul>
  );
}
