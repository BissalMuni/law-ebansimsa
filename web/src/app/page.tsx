import Link from "next/link";

import { listProjects } from "@/server/projects";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

// DB 를 읽으므로 정적 프리렌더 대신 요청 시 렌더 (빌드 시 DB 접근 회피)
export const dynamic = "force-dynamic";

// 홈 — 프로젝트 목록 + 새 입안 진입 (US1). 단일 프로젝트 중심이나 목록으로 접근.
export default async function Home() {
  const projects = await listProjects();

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">법이반심사</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            조례 입안 협업 IDE
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild>
            <Link href="/new">새 입안</Link>
          </Button>
        </div>
      </div>

      <ul className="mt-8 space-y-2">
        {projects.length === 0 && (
          <li className="rounded-lg border border-dashed border-input p-8 text-center text-sm text-muted-foreground">
            아직 입안 프로젝트가 없습니다. “새 입안”으로 시작하세요.
          </li>
        )}
        {projects.map((p) => (
          <li key={p.id}>
            <Link
              href={`/draft/${p.id}`}
              className="flex items-center justify-between rounded-lg border border-input p-4 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="font-medium text-foreground">{p.title}</span>
              <span className="text-xs text-muted-foreground">
                {p.municipality} · 진행률 {p.progress}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
