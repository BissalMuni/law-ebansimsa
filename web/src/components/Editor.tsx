"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { X, Columns2, FileText } from "lucide-react";

import { useUIStore } from "@/lib/store/ui-store";
import { useEditorStore } from "@/lib/store/editor-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Monaco 는 브라우저 전용 — SSR 비활성 동적 로드
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      에디터 로딩 중…
    </div>
  ),
});

// 라이트/다크 테마를 .dark 클래스에서 감지 (P5 대비)
function useMonacoTheme() {
  const [theme, setTheme] = useState<"light" | "vs-dark">("light");
  useEffect(() => {
    const update = () =>
      setTheme(
        document.documentElement.classList.contains("dark")
          ? "vs-dark"
          : "light",
      );
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  return theme;
}

function Pane({ docId }: { docId: string }) {
  const doc = useEditorStore((s) => s.documents[docId]);
  const setValue = useEditorStore((s) => s.setValue);
  const theme = useMonacoTheme();

  if (!doc) return null;
  return (
    <MonacoEditor
      theme={theme}
      language={doc.language}
      value={doc.value}
      onChange={(v) => setValue(doc.id, v ?? "")}
      options={{
        readOnly: doc.readOnly,
        minimap: { enabled: false },
        wordWrap: "on",
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        renderWhitespace: "none",
      }}
    />
  );
}

// Editor Group — 멀티탭 + split 뷰 (FR-014, ui-spec §6.3)
export function EditorArea() {
  const { tabs, activeTabId, splitView, setActiveTab, closeTab, toggleSplitView } =
    useUIStore();

  if (tabs.length === 0 || !activeTabId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <FileText className="size-8 opacity-40" aria-hidden />
        <p>열린 문서가 없습니다. 단계를 선택해 작성을 시작하세요.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tab Bar */}
      <div
        role="tablist"
        aria-label="에디터 탭"
        className="flex items-center border-b border-border bg-card"
      >
        <div className="flex flex-1 overflow-x-auto">
          {tabs.map((t) => {
            const active = t.id === activeTabId;
            return (
              <div
                key={t.id}
                role="tab"
                aria-selected={active}
                className={cn(
                  "group flex items-center gap-2 border-r border-border px-3 py-1.5 text-sm",
                  active
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:bg-accent/40",
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t.title}
                </button>
                <button
                  type="button"
                  aria-label={`${t.title} 탭 닫기`}
                  onClick={() => closeTab(t.id)}
                  className="rounded p-0.5 opacity-50 hover:bg-accent hover:opacity-100"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="에디터 분할 보기 토글"
          aria-pressed={splitView}
          onClick={toggleSplitView}
          className="mr-1 size-7"
        >
          <Columns2 className="size-4" aria-hidden />
        </Button>
      </div>

      {/* Editor body — split 시 좌우 두 패널 */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <Pane docId={activeTabId} />
        </div>
        {splitView && (
          <div className="min-w-0 flex-1 border-l border-border">
            <Pane docId={activeTabId} />
          </div>
        )}
      </div>
    </div>
  );
}
