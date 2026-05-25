"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, FilePen, Files, Search, ExternalLink } from "lucide-react";

import { createProject } from "@/server/projects";
import {
  PROJECT_KINDS,
  isAmendmentKind,
  type ProjectKind,
} from "@/lib/project-rules";
import { SIDO_NAMES, getSigungu } from "@/lib/regions";
import {
  searchOrdinances,
  fetchOrdinanceContent,
  type OrdinanceHit,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

// 네이티브 select 를 Input 과 동일한 토큰으로 스타일링 (별도 Select 컴포넌트 미도입)
const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export default function NewProjectPage() {
  const router = useRouter();
  const [kind, setKind] = useState<ProjectKind>("enact");
  const [title, setTitle] = useState("");
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 개정 모드 전용 — 기존 조례 확보
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<OrdinanceHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<OrdinanceHit | null>(null);
  const [originalContent, setOriginalContent] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);

  const amendment = isAmendmentKind(kind);
  const sigunguList = getSigungu(sido);

  // 시도 변경 시 종속 시군구는 초기화 (단층제 세종은 시군구 없음)
  function handleSidoChange(next: string) {
    setSido(next);
    setSigungu("");
  }

  async function runSearch() {
    if (!query.trim()) return;
    setError(null);
    setSearching(true);
    try {
      const { hits } = await searchOrdinances(query.trim());
      // 선택한 지역으로 결과 범위를 좁힌다(강남구 500개 전체 로딩 대신).
      // 지자체 표기가 달라 비면 전체를 보여줘 막히지 않게 한다.
      const scope = sigungu || sido;
      const scoped = scope
        ? hits.filter((h) => h.municipality?.includes(scope))
        : hits;
      setHits(scoped.length > 0 ? scoped : hits);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "검색 실패");
    } finally {
      setSearching(false);
    }
  }

  async function selectHit(hit: OrdinanceHit) {
    setSelected(hit);
    setTitle(hit.title); // 제명 자동 채움
    // 일련번호가 있으면 본문을 자동 로드한다. 실패하면 복붙으로 폴백 (안내만)
    if (!hit.id) return;
    setError(null);
    setLoadingContent(true);
    try {
      const { content } = await fetchOrdinanceContent(hit.id);
      if (content.trim()) {
        setOriginalContent(content);
      } else {
        setError("원문을 불러오지 못했습니다. 아래에 직접 붙여넣으세요.");
      }
    } catch {
      setError("원문 자동 로드에 실패했습니다. 원문 링크를 열어 직접 붙여넣으세요.");
    } finally {
      setLoadingContent(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const project = await createProject({
          kind,
          title,
          sido,
          sigungu: sigungu || undefined,
          sourceUrl: selected?.source_url ?? undefined,
          originalContent: amendment ? originalContent : undefined,
        });
        router.push(`/draft/${project.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "프로젝트 생성 실패");
      }
    });
  }

  // 제출 가능 여부 — 서버 검증과 동일 규칙을 클라이언트에서 선반영
  const canSubmit =
    title.trim() !== "" &&
    sido !== "" &&
    (!amendment || originalContent.trim() !== "");

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
              const isSelected = kind === k;
              const { Icon } = meta;
              return (
                <button
                  type="button"
                  key={k}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setKind(k)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-primary bg-accent"
                      : "border-input hover:bg-accent/50",
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cn(
                      "size-5",
                      isSelected ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className="font-medium text-foreground">
                    {meta.label}
                    {isSelected && (
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

        {/* 지자체 — 시도 → 시군구 종속 드롭다운 (정적 데이터, 외부 API 무관) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sido">시도</Label>
            <select
              id="sido"
              value={sido}
              onChange={(e) => handleSidoChange(e.target.value)}
              className={SELECT_CLASS}
              required
            >
              <option value="" disabled>
                시도 선택
              </option>
              {SIDO_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sigungu">시군구</Label>
            <select
              id="sigungu"
              value={sigungu}
              onChange={(e) => setSigungu(e.target.value)}
              className={SELECT_CLASS}
              disabled={!sido || sigunguList.length === 0}
            >
              <option value="">
                {sido && sigunguList.length === 0
                  ? "해당 없음 (단층제)"
                  : "시군구 선택"}
              </option>
              {sigunguList.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 개정 모드: 기존 조례 검색 → 선택 → 원문 확보 (제정은 숨김) */}
        {amendment && (
          <fieldset className="space-y-4 rounded-lg border border-input p-4">
            <legend className="px-1 text-sm font-medium text-foreground">
              기존 조례 원문
            </legend>

            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runSearch();
                  }
                }}
                placeholder="조례명 검색 (국가법령정보센터)"
                aria-label="조례명 검색"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void runSearch()}
                disabled={searching || !query.trim()}
              >
                <Search className="size-4" aria-hidden />
                {searching ? "검색 중…" : "검색"}
              </Button>
            </div>

            {searched && hits.length === 0 && (
              <p className="text-xs text-muted-foreground">
                검색 결과가 없습니다. 아래에 원문을 직접 붙여넣으세요.
              </p>
            )}

            {hits.length > 0 && (
              <ul className="max-h-48 space-y-1 overflow-y-auto" aria-label="검색 결과">
                {hits.map((h, i) => {
                  const isPicked = selected === h;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => void selectHit(h)}
                        aria-pressed={isPicked}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md border p-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isPicked
                            ? "border-primary bg-accent"
                            : "border-border hover:bg-accent/50",
                        )}
                      >
                        <span>
                          {h.title}
                          {h.municipality && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              · {h.municipality}
                            </span>
                          )}
                        </span>
                        {isPicked && (
                          <span className="text-primary" aria-hidden>
                            ✓
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="originalContent">원문</Label>
                {selected?.source_url && (
                  <a
                    href={selected.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    원문 열기 <ExternalLink className="size-3" aria-hidden />
                  </a>
                )}
              </div>
              <Textarea
                id="originalContent"
                rows={8}
                value={originalContent}
                onChange={(e) => setOriginalContent(e.target.value)}
                placeholder="조례 원문을 붙여넣으세요. 생성 시 조문 단위로 자동 분리됩니다."
              />
              <p className="text-xs text-muted-foreground">
                현재는 검색으로 조례를 찾아 원문 링크를 연 뒤 본문을 복사·붙여넣습니다.
                붙여넣은 원문은 생성 시 조문(條文)으로 파싱됩니다.
              </p>
            </div>
          </fieldset>
        )}

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

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending || !canSubmit}>
            {pending ? "생성 중…" : "입안 시작"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/")}>
            취소
          </Button>
        </div>
      </form>
    </main>
  );
}
