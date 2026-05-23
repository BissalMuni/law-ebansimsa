"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MAIN_SUBSTAGE_CANDIDATES } from "@/lib/substages";
import { setMainSubStages } from "@/server/stages";

// 본칙 항목 선택 모달 (US5) — AI 추천 후보를 체크박스로 확정 → sub-stage 생성
export function MainStageModal({
  open,
  onOpenChange,
  projectId,
  mainStageId,
  initialSelected = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  mainStageId: string;
  initialSelected?: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialSelected),
  );
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirm() {
    setBusy(true);
    try {
      await setMainSubStages(projectId, mainStageId, [...selected]);
      onOpenChange(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>본칙 항목 구성</DialogTitle>
          <DialogDescription>
            제명·목적에 맞는 본칙 항목을 선택하세요. 선택한 항목이 각각
            sub-stage가 되며 모두 완료해야 부칙으로 진행합니다.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {MAIN_SUBSTAGE_CANDIDATES.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <Checkbox
                id={`sub-${c.id}`}
                checked={selected.has(c.id)}
                onCheckedChange={() => toggle(c.id)}
              />
              <Label htmlFor={`sub-${c.id}`} className="cursor-pointer">
                {c.label}
              </Label>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={busy} onClick={() => void confirm()}>
            {busy ? "구성 중…" : `${selected.size}개 항목 확정`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
