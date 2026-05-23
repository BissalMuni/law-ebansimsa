// 이력·시간여행 — Snapshot 타임라인 로직 (US8). 순수.

export interface SnapshotArticle {
  articleNo: number;
  body: string;
}

export interface SnapshotLike {
  id: string;
  trigger: "confirm" | "ai_apply" | "manual_save";
  actor: "user" | "ai";
  label?: string | null;
  content: SnapshotArticle[];
  createdAt: Date;
}

export const TRIGGER_LABELS: Record<SnapshotLike["trigger"], string> = {
  confirm: "단계 확정",
  ai_apply: "AI 응답 적용",
  manual_save: "수동 저장",
};

export function snapshotTitle(s: SnapshotLike): string {
  return s.label?.trim() ? s.label : TRIGGER_LABELS[s.trigger];
}

// 최신순(내림차순) 정렬
export function sortByRecent(snaps: SnapshotLike[]): SnapshotLike[] {
  return [...snaps].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}

// 스냅샷 본문 복원 — 조 배열을 텍스트로 (시간여행 탭 표시용)
export function snapshotToText(s: SnapshotLike): string {
  return s.content
    .slice()
    .sort((a, b) => a.articleNo - b.articleNo)
    .map((a) => `제${a.articleNo}조\n${a.body}`)
    .join("\n\n");
}
