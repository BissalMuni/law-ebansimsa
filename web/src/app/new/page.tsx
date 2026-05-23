"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, FilePen, Files } from "lucide-react";

import { createProject } from "@/server/projects";
import { PROJECT_KINDS, type ProjectKind } from "@/lib/project-rules";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// 작업 종류 메타 — 3중 인코딩(아이콘·텍스트·설명)으로 접근성 확보 (P5, US1/FR-001)
const KIND_META: Record<
  ProjectKind,
  { label: string; desc: string; Icon: typeof FilePlus2 }
> = {
  enact: {
    label: "제정",
    desc: "백지에서 새 조례를 작성합니다",
    Icon: FilePlus2,
  },
  amend_partial: {
    label: "일부개정",
    desc: "기존 조례의 일부 조문을 개정합니다",
    Icon: FilePen,
  },
  amend_full: {
    label: "전부개정",
    desc: "기존 조례를 전부 개정합니다",
    Icon: Files,
  },
};

export default function NewProjectPage() {
  const router = useRouter();
  const [kind, setKind] = useState<ProjectKind>("enact");
  const [title, setTitle] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const project = await createProject({ kind, title, municipality });
        router.push(`/draft/${project.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "프로젝트 생성 실패");
      }
    });
  }

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">새 입안 프로젝트</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        작업 종류를 선택하고 조례 정보를 입력하세요.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <fieldset>
          <legend className="text-sm font-medium text-foreground">작업 종류</legend>
          {/* 라디오 그룹 — 키보드 전체 접근 (P5) */}
          <div
            role="radiogroup"
            aria-label="작업 종류"
            className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {PROJECT_KINDS.map((k) => {
              const meta = KIND_META[k];
              const selected = kind === k;
              const { Icon } = meta;
              return (
                <button
                  type="button"
                  key={k}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setKind(k)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-primary bg-accent"
                      : "border-input hover:bg-accent/50",
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cn(
                      "size-5",
                      selected ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className="font-medium text-foreground">
                    {meta.label}
                    {selected && (
                      <span className="ml-1 text-primary" aria-hidden>
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">{meta.desc}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="title">제명</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 청년 창업 지원 조례"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="municipality">지자체명</Label>
          <Input
            id="municipality"
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            placeholder="예: 서울특별시"
            required
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "생성 중…" : "입안 시작"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/")}
          >
            취소
          </Button>
        </div>
      </form>
    </main>
  );
}
