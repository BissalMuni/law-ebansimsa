"use client";

import { useState } from "react";
import { FileInput } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadOrdinanceModal } from "@/components/LoadOrdinanceModal";

// 개정 모드 전용 — 기존 조례 로드 진입 버튼 (US6)
export function AmendLoadButton({
  projectId,
  targetStageId,
}: {
  projectId: string;
  targetStageId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <FileInput className="size-3.5" aria-hidden />
        기존 조례 로드
      </Button>
      <LoadOrdinanceModal
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        targetStageId={targetStageId}
      />
    </>
  );
}
