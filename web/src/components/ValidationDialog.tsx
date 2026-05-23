"use client";

import { useState } from "react";
import { AlertTriangle, Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  allViolationsResolved,
  cellKey,
  getViolations,
  isViolationResolved,
  type Resolution,
} from "@/lib/validation";
import type { ValidationCellResult } from "@/lib/api-client";

// 단계 확정 검증 다이얼로그 (ui-spec §10.4) — 무시 시 사유 강제 (헌법 P6)
export function ValidationDialog({
  open,
  results,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  results: ValidationCellResult[];
  // 모든 위반 해결 후 확정 — resolutions(수용/무시+사유) 를 상위로 전달
  onConfirm: (resolutions: Record<string, Resolution>) => void;
  onCancel: () => void;
}) {
  const violations = getViolations(results);
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});

  function setResolution(v: ValidationCellResult, r: Resolution) {
    setResolutions((prev) => ({
      ...prev,
      [cellKey(v.article_id, v.criterion_id)]: r,
    }));
  }

  const ready = allViolationsResolved(violations, resolutions);

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-xl"
        // 의도적 마찰 — 모달 외부 클릭·ESC 로 닫기 불가 (ui-spec §10.4)
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" aria-hidden />
            검증 — 위반 {violations.length}건 발견
          </DialogTitle>
          <DialogDescription>
            각 위반을 수용하거나, 사유를 입력해 무시해야 확정할 수 있습니다 (P6).
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[50vh] space-y-4 overflow-y-auto">
          {violations.map((v) => {
            const key = cellKey(v.article_id, v.criterion_id);
            const res = resolutions[key];
            const resolved = isViolationResolved(v, resolutions);
            return (
              <li key={key} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    §{v.criterion_id}{" "}
                    <Badge variant="outline" className="ml-1 text-xs">
                      {v.source}
                    </Badge>
                  </span>
                  {resolved && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Check className="size-3" aria-hidden /> 해결
                    </span>
                  )}
                </div>
                {v.reason && (
                  <p className="mt-1 text-sm text-muted-foreground">{v.reason}</p>
                )}
                {v.suggestion && (
                  <p className="mt-1 text-sm">→ 제안: {v.suggestion}</p>
                )}

                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={res?.kind === "accept" ? "default" : "outline"}
                    onClick={() => setResolution(v, { kind: "accept" })}
                  >
                    수용
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={res?.kind === "dismiss" ? "default" : "outline"}
                    onClick={() =>
                      setResolution(v, { kind: "dismiss", reason: res?.reason ?? "" })
                    }
                  >
                    무시 (사유 입력)
                  </Button>
                </div>

                {res?.kind === "dismiss" && (
                  <div className="mt-2">
                    <Textarea
                      aria-label={`§${v.criterion_id} 무시 사유`}
                      placeholder="무시 사유를 입력하세요 (필수, 이력에 기록됩니다)"
                      value={res.reason ?? ""}
                      onChange={(e) =>
                        setResolution(v, { kind: "dismiss", reason: e.target.value })
                      }
                      rows={2}
                    />
                    {!res.reason?.trim() && (
                      <p className="mt-1 text-xs text-destructive">
                        사유 없이는 무시할 수 없습니다 (P6).
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            돌아가기
          </Button>
          <Button
            type="button"
            disabled={!ready}
            onClick={() => onConfirm(resolutions)}
          >
            확정 진행
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
