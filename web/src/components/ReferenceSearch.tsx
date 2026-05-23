"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { searchOrdinances, type OrdinanceHit } from "@/lib/api-client";
import { createReference } from "@/server/references";

// 타 지자체 조례 검색·첨부 (US7) — 검색 결과를 참고로 AI 컨텍스트에 포함 (P4 복제 금지)
export function ReferenceSearch({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<OrdinanceHit[]>([]);
  const [pasteFor, setPasteFor] = useState<OrdinanceHit | null>(null);
  const [pasteContent, setPasteContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setError(null);
    try {
      const { hits } = await searchOrdinances(query);
      setHits(hits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색 실패");
    }
  }

  async function attach(hit: OrdinanceHit, content: string) {
    await createReference({
      projectId,
      source: "opendata",
      title: hit.title,
      municipality: hit.municipality,
      content,
      sourceUrl: hit.source_url,
      includedInContext: true,
    });
    setPasteFor(null);
    setPasteContent("");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>타 지자체 조례 참고</DialogTitle>
          <DialogDescription>
            유사 조례를 검색해 AI 컨텍스트에 첨부합니다. AI는 참고하되 그대로
            복제하지 않습니다 (P4).
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="조례명 검색 (국가법령정보센터)"
          />
          <Button type="button" variant="outline" onClick={() => void search()}>
            검색
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <ul className="max-h-60 space-y-1 overflow-y-auto">
          {hits.map((h, i) => (
            <li key={i} className="rounded-md border border-border p-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {h.title}
                  {h.municipality && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      · {h.municipality}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {h.source_url && (
                    <a
                      href={h.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      원문 <ExternalLink className="size-3" aria-hidden />
                    </a>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    onClick={() => {
                      setPasteFor(h);
                      setPasteContent("");
                    }}
                  >
                    <Plus className="size-3" aria-hidden /> 첨부
                  </Button>
                </div>
              </div>
              {pasteFor === h && (
                <div className="mt-2 space-y-2">
                  <Textarea
                    rows={4}
                    placeholder="참고할 조문을 붙여넣으세요 (선택)"
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void attach(h, pasteContent)}
                  >
                    AI 컨텍스트에 첨부
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
