"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";

import { useUIStore } from "@/lib/store/ui-store";
import { validatePrecise, type ValidationCellResult } from "@/lib/api-client";
import {
  DEFAULT_CRITERIA,
  cellKey,
  getViolations,
  type Resolution,
} from "@/lib/validation";
import { listStageSections } from "@/server/sections";
import { persistValidationCells } from "@/server/validation";
import { confirmStage, reopenStage } from "@/server/stages";
import { Button } from "@/components/ui/button";
import type { StageItemData } from "@/components/StageItem";
import { ValidationDialog } from "@/components/ValidationDialog";
import { MainStageModal } from "@/components/MainStageModal";
import { ListPlus } from "lucide-react";

export function StageConfirmBar({
  projectId,
  stages,
  extra,
}: {
  projectId: string;
  stages: StageItemData[];
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const activeStageId = useUIStore((s) => s.activeStageId);
  const current = stages.find((s) => s.id === activeStageId);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ValidationCellResult[] | null>(null);
  const [subModalOpen, setSubModalOpen] = useState(false);

  if (!current) return null;

  // 위반 셀 → ValidationResult 레코드 매핑 (무시 사유 반영, P6)
  function toCells(
    all: ValidationCellResult[],
    resolutions: Record<string, Resolution>,
  ) {
    return all.map((r) => {
      const res = resolutions[cellKey(r.article_id, r.criterion_id)];
      return {
        sectionId: r.article_id,
        criterionId: r.criterion_id,
        source: r.source,
        verdict: r.verdict,
        severity: r.severity,
        reason: r.reason ?? null,
        suggestion: r.suggestion ?? null,
        dismissedReason:
          res?.kind === "dismiss" ? (res.reason ?? null) : null,
      };
    });
  }

  async function finalizeConfirm(
    all: ValidationCellResult[],
    resolutions: Record<string, Resolution>,
  ) {
    await persistValidationCells(toCells(all, resolutions));
    await confirmStage(projectId, current!.id);
    setResults(null);
    router.refresh();
  }

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      const sections = await listStageSections(projectId, current!.id);
      // 조문이 없으면(예: 제명 단계) 검증 없이 확정
      if (sections.length === 0) {
        await confirmStage(projectId, current!.id);
        router.refresh();
        return;
      }
      const resp = await validatePrecise({
        articles: sections.map((s) => ({
          article_id: s.id,
          title: s.title,
          text: s.body,
        })),
        criteria: DEFAULT_CRITERIA,
      });
      const violations = getViolations(resp.results);
      if (violations.length === 0) {
        // 위반 없음 → 매트릭스 기록 후 바로 확정 (다음 단계 unlock, P2)
        await finalizeConfirm(resp.results, {});
      } else {
        // 위반 있음 → 다이얼로그로 수용/무시(사유) 처리 (P6)
        setResults(resp.results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "검증·확정 실패");
    } finally {
      setBusy(false);
    }
  }

  async function handleReopen() {
    setError(null);
    setBusy(true);
    try {
      await reopenStage(projectId, current!.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "재수정 실패");
    } finally {
      setBusy(false);
    }
  }

  const confirmed = current.status === "confirmed";
  const locked = current.status === "locked";

  return (
    <div className="flex items-center gap-3 border-b border-border bg-card px-3 py-2">
      <span className="text-sm font-medium">
        {current.order}. {current.label}
      </span>
      {extra}
      <div className="ml-auto flex items-center gap-2">
        {error && <span className="text-xs text-destructive">{error}</span>}
        {/* 본칙 단계 — 동적 sub-stage 구성 (US5) */}
        {current.key === "main" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSubModalOpen(true)}
          >
            <ListPlus className="size-3.5" aria-hidden />
            본칙 항목 구성
          </Button>
        )}
        {confirmed ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void handleReopen()}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            재수정
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={busy || locked}
            onClick={() => void handleConfirm()}
          >
            <CheckCircle2 className="size-3.5" aria-hidden />
            {busy ? "검증 중…" : "단계 확정"}
          </Button>
        )}
      </div>

      {results && (
        <ValidationDialog
          open
          results={results}
          onCancel={() => setResults(null)}
          onConfirm={(resolutions) => void finalizeConfirm(results, resolutions)}
        />
      )}

      {current.key === "main" && (
        <MainStageModal
          open={subModalOpen}
          onOpenChange={setSubModalOpen}
          projectId={projectId}
          mainStageId={current.id}
        />
      )}
    </div>
  );
}
