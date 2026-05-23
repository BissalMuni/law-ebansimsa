"use client";

import { useState } from "react";

import { listSections } from "@/server/sections";
import { validateFull, type ValidationCellResult } from "@/lib/api-client";
import { DEFAULT_CRITERIA, isMatrixComplete } from "@/lib/validation";
import { buildMatrixIndex, verdictAt } from "@/lib/matrix";
import { VERDICT_ENCODING } from "@/lib/encoding";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// verdict 색상 — 기호·텍스트는 VERDICT_ENCODING(테스트된 P5 단일 출처)에서 가져온다
const VERDICT_COLOR: Record<ValidationCellResult["verdict"], string> = {
  pass: "text-green-600 dark:text-green-400",
  fail: "text-destructive",
  na: "text-muted-foreground",
  pending: "text-amber-600 dark:text-amber-400",
};

// 검토 매트릭스 탭 (Stage 7, ui-spec §6.3.1) — 전체 조문×기준 검증 매트릭스
export function ReviewMatrix({ projectId }: { projectId: string }) {
  const [results, setResults] = useState<ValidationCellResult[] | null>(null);
  const [articles, setArticles] = useState<{ id: string; label: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const sections = await listSections(projectId);
      if (sections.length === 0) {
        setError("검토할 조문이 없습니다.");
        setResults(null);
        return;
      }
      setArticles(
        sections.map((s) => ({
          id: s.id,
          label: s.articleLabel ?? `제${s.articleNo}조`,
        })),
      );
      const resp = await validateFull({
        articles: sections.map((s) => ({
          article_id: s.id,
          title: s.title,
          text: s.body,
        })),
        criteria: DEFAULT_CRITERIA,
      });
      setResults(resp.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "전체 검토 실패");
    } finally {
      setBusy(false);
    }
  }

  const idx = results ? buildMatrixIndex(results) : null;
  const complete = results ? isMatrixComplete(results) : false;

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center gap-3">
        <Button type="button" size="sm" disabled={busy} onClick={() => void run()}>
          {busy ? "검토 중…" : "전체 검토 실행"}
        </Button>
        {results && (
          <span
            className={cn(
              "text-xs",
              complete ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400",
            )}
          >
            {complete
              ? "전 셀 충족 (누락 0건)"
              : "미완성 — 일부 셀이 채워지지 않음"}
          </span>
        )}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>

      {idx && (
        <div className="overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border border-border px-2 py-1 text-left">조문</th>
                {DEFAULT_CRITERIA.map((c) => (
                  <th key={c.criterion_id} className="border border-border px-2 py-1">
                    §{c.criterion_id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.id}>
                  <td className="border border-border px-2 py-1 font-medium">
                    {a.label}
                  </td>
                  {DEFAULT_CRITERIA.map((c) => {
                    const v = verdictAt(idx, a.id, c.criterion_id);
                    const enc = VERDICT_ENCODING[v];
                    return (
                      <td
                        key={c.criterion_id}
                        className={cn(
                          "border border-border px-2 py-1 text-center",
                          VERDICT_COLOR[v],
                        )}
                        title={enc.text}
                      >
                        <span aria-hidden>{enc.symbol}</span>
                        <span className="sr-only">{enc.text}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
