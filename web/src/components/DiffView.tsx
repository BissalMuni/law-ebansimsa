"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { diffLines } from "diff";

import {
  alignArticles,
  countChanges,
  formatChangeCount,
  type DiffArticle,
} from "@/lib/diff";

const MonacoDiff = dynamic(
  () => import("@monaco-editor/react").then((m) => m.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Diff 로딩 중…
      </div>
    ),
  },
);

export interface DiffSection {
  articleNo: number;
  articleLabel?: string | null;
  originalBody?: string | null;
  body: string;
}

function joinText(
  sections: DiffSection[],
  pick: (s: DiffSection) => string | null | undefined,
): string {
  return sections
    .map((s) => `${s.articleLabel ?? `제${s.articleNo}조`}\n${pick(s) ?? ""}`)
    .join("\n\n");
}

// 개정 diff 뷰 (US6, FR-010) — 원본 ↔ 개정안 Monaco DiffEditor + 조 단위 변경 카운트
export function DiffView({ sections }: { sections: DiffSection[] }) {
  const { counts, lineStat, originalText, modifiedText } = useMemo(() => {
    const originalArticles: DiffArticle[] = sections
      .filter((s) => s.originalBody != null)
      .map((s) => ({ articleNo: s.articleNo, body: s.originalBody as string }));
    const modifiedArticles: DiffArticle[] = sections.map((s) => ({
      articleNo: s.articleNo,
      body: s.body,
    }));
    const counts = countChanges(alignArticles(originalArticles, modifiedArticles));

    const originalText = joinText(sections, (s) => s.originalBody);
    const modifiedText = joinText(sections, (s) => s.body);
    // jsdiff 로 라인 단위 추가/삭제 통계 (표시용)
    const parts = diffLines(originalText, modifiedText);
    const lineStat = parts.reduce(
      (acc, p) => {
        const n = p.count ?? 0;
        if (p.added) acc.added += n;
        else if (p.removed) acc.removed += n;
        return acc;
      },
      { added: 0, removed: 0 },
    );

    return { counts, lineStat, originalText, modifiedText };
  }, [sections]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-3 py-1.5 text-xs">
        <span className="font-medium">변경 요약</span>
        <span className="font-mono text-muted-foreground">
          {formatChangeCount(counts)}
        </span>
        <span className="text-muted-foreground">
          (조: +{counts.added} ~{counts.modified} -{counts.deleted}, 줄: +
          {lineStat.added} -{lineStat.removed})
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <MonacoDiff
          original={originalText}
          modified={modifiedText}
          language="markdown"
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
}
