"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  parseOrdinance,
  searchOrdinances,
  type OrdinanceHit,
} from "@/lib/api-client";
import { buildLoadedSections } from "@/lib/amend";
import { createSections } from "@/server/sections";

// 개정 모드 기존 조례 로드 (US6) — 업로드 / 검색 / 붙여넣기
export function LoadOrdinanceModal({
  open,
  onOpenChange,
  projectId,
  targetStageId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  targetStageId: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<OrdinanceHit[]>([]);

  async function handleFile(file: File) {
    setContent(await file.text());
  }

  async function search() {
    setError(null);
    try {
      const { hits } = await searchOrdinances(query);
      setHits(hits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색 실패");
    }
  }

  async function load() {
    if (!content.trim()) {
      setError("로드할 조례 원문이 비어 있습니다.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { articles } = await parseOrdinance(content);
      const sections = buildLoadedSections(articles, projectId, targetStageId);
      await createSections(sections);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "조례 로드 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>기존 조례 로드</DialogTitle>
          <DialogDescription>
            개정할 기존 조례를 불러옵니다. 원본은 읽기 전용으로 보존됩니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="paste">
          <TabsList>
            <TabsTrigger value="paste">붙여넣기</TabsTrigger>
            <TabsTrigger value="upload">업로드</TabsTrigger>
            <TabsTrigger value="search">검색</TabsTrigger>
          </TabsList>

          <TabsContent value="paste">
            <Textarea
              aria-label="조례 원문"
              rows={10}
              placeholder="조례 전문을 붙여넣으세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </TabsContent>

          <TabsContent value="upload">
            <input
              type="file"
              accept=".txt,.md,.text"
              aria-label="조례 파일 업로드"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
              className="text-sm"
            />
            {content && (
              <p className="mt-2 text-xs text-muted-foreground">
                {content.length}자 로드됨 (붙여넣기 탭에서 확인·수정 가능)
              </p>
            )}
          </TabsContent>

          <TabsContent value="search">
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
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {hits.map((h, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span>
                    {h.title}
                    {h.municipality && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        · {h.municipality}
                      </span>
                    )}
                  </span>
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
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              검색 결과 원문을 붙여넣기 탭에 붙여 로드하세요.
            </p>
          </TabsContent>
        </Tabs>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={busy} onClick={() => void load()}>
            {busy ? "로드 중…" : "조례 로드"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
