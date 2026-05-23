"use client";

import { AlertTriangle, Lightbulb } from "lucide-react";

import { useProblemsStore } from "@/lib/store/problems-store";
import { sortProblems, toProblems } from "@/lib/problems";

// 문제 패널 (ui-spec §6.5, FR-006) — 인라인 힌트·검증 위반을 묶어 표시
export function ProblemsPanel() {
  const hints = useProblemsStore((s) => s.hints);
  const problems = sortProblems(toProblems(hints));

  if (problems.length === 0) {
    return (
      <p className="p-3 text-sm text-muted-foreground">
        발견된 문제가 없습니다. 작성 중 가벼운 힌트가 여기에 표시됩니다.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {problems.map((p, i) => (
        <li key={`${p.criterionId}-${i}`} className="flex items-start gap-2 px-3 py-2 text-sm">
          {p.severity === "violation" ? (
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden
            />
          ) : (
            <Lightbulb
              className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden
            />
          )}
          <span>
            <code className="rounded bg-muted px-1 text-xs">§{p.criterionId}</code>{" "}
            <span className="sr-only">
              {p.severity === "violation" ? "위반" : "힌트"}:
            </span>
            {p.message}
          </span>
        </li>
      ))}
    </ul>
  );
}
