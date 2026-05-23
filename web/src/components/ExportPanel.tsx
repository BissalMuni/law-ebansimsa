"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import { listSections } from "@/server/sections";
import { exportOrdinance } from "@/lib/api-client";
import { buildExportSections, exportFilename } from "@/lib/export";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// 최종안 출력 (Stage 8, US9/FR-013) — DOCX/PDF 온디맨드 생성·다운로드 (비영속 P7)
export function ExportPanel({
  projectId,
  projectTitle,
  municipality,
}: {
  projectId: string;
  projectTitle: string;
  municipality: string;
}) {
  const [format, setFormat] = useState<"docx" | "pdf">("docx");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportNow() {
    setBusy(true);
    setError(null);
    try {
      const sections = await listSections(projectId);
      if (sections.length === 0) {
        setError("출력할 조문이 없습니다.");
        return;
      }
      const blob = await exportOrdinance({
        project_title: projectTitle,
        municipality,
        sections: buildExportSections(sections),
        format,
      });
      // blob 은 저장하지 않고 즉시 다운로드 (온디맨드, P7)
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFilename(projectTitle, format);
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "내보내기 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 p-3">
      <p className="text-sm text-muted-foreground">
        완성된 조례를 표준 문서로 내보냅니다 (의회 제출·내부 결재용).
      </p>
      <div role="radiogroup" aria-label="출력 형식" className="flex gap-2">
        {(["docx", "pdf"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={format === f}
            onClick={() => setFormat(f)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              format === f
                ? "border-primary bg-accent text-foreground"
                : "border-input text-muted-foreground",
            )}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>
      <Button type="button" disabled={busy} onClick={() => void exportNow()}>
        <Download className="size-4" aria-hidden />
        {busy ? "생성 중…" : `${format.toUpperCase()} 내보내기`}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
