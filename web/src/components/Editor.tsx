"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import { X, Columns2, FileText } from "lucide-react";

import { useUIStore } from "@/lib/store/ui-store";
import { useEditorStore } from "@/lib/store/editor-store";
import { saveSection } from "@/server/sections";
import { debounce } from "@/lib/debounce";
import { streamDraft, validateInline } from "@/lib/api-client";
import { useProblemsStore } from "@/lib/store/problems-store";
import { applyDraftEvent, initialDraftState } from "@/lib/chat";
import { buildRewriteIntent, type RewriteKind } from "@/lib/rewrite";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FloatingToolbar } from "@/components/FloatingToolbar";

type MonacoEditorInstance = Parameters<OnMount>[0];
interface SelectionState {
  top: number;
  left: number;
  text: string;
}

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
  const setSectionId = useEditorStore((s) => s.setSectionId);
  const theme = useMonacoTheme();

  // 500ms idle 자동저장 (ui-spec §7.6) — meta 가 있는 문서만 OrdinanceSection 으로 저장
  const autosave = useMemo(
    () =>
      debounce(async (value: string) => {
        const cur = useEditorStore.getState().documents[docId];
        const meta = cur?.meta;
        if (!meta || cur.readOnly) return;
        try {
          const saved = await saveSection({
            id: meta.sectionId,
            projectId: meta.projectId,
            stageId: meta.stageId,
            articleNo: meta.articleNo,
            articleLabel: meta.articleLabel,
            title: cur.title,
            body: value,
            order: meta.order,
          });
          if (!meta.sectionId) setSectionId(docId, saved.id);
        } catch {
          // 자동저장 실패는 조용히 무시 (다음 idle 에 재시도)
        }
      }, 500),
    [docId, setSectionId],
  );

  useEffect(() => () => autosave.cancel(), [autosave]);

  // 작성 중 가벼운 인라인 힌트 (T032, FR-006) — 700ms idle 후 Haiku 검증
  const setHints = useProblemsStore((s) => s.setHints);
  const inlineCheck = useMemo(
    () =>
      debounce(async (value: string) => {
        const cur = useEditorStore.getState().documents[docId];
        if (!cur || !value.trim()) return;
        try {
          const { hints } = await validateInline({
            article: {
              article_id: cur.meta?.sectionId ?? docId,
              title: cur.title,
              text: value,
            },
          });
          setHints(hints);
        } catch {
          // 힌트 실패는 무시
        }
      }, 700),
    [docId, setHints],
  );
  useEffect(() => () => inlineCheck.cancel(), [inlineCheck]);

  // --- 부유 툴바: 선택 영역 감지 + AI 재작성 (T025) ---
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [rewriting, setRewriting] = useState(false);

  const onMount: OnMount = (editor) => {
    editorRef.current = editor;
    // 200ms 디바운스 — 선택이 멈춘 뒤 툴바 표시 (ui-spec)
    const handle = debounce(() => {
      const sel = editor.getSelection();
      const model = editor.getModel();
      if (!sel || sel.isEmpty() || !model) {
        setSelection(null);
        return;
      }
      const text = model.getValueInRange(sel);
      const pos = editor.getScrolledVisiblePosition({
        lineNumber: sel.startLineNumber,
        column: sel.startColumn,
      });
      if (!pos) return;
      setSelection({ top: pos.top, left: pos.left, text });
    }, 200);
    editor.onDidChangeCursorSelection(() => handle());
    editor.onDidScrollChange(() => setSelection(null));
  };

  async function rewrite(kind: RewriteKind) {
    const editor = editorRef.current;
    if (!editor || !selection) return;
    const sel = editor.getSelection();
    if (!sel) return;
    setRewriting(true);
    let draft = initialDraftState();
    try {
      // AI 재작성 — 의도에 선택 텍스트 포함. 근거·복제 금지는 api 가 강제 (P1/P4)
      for await (const ev of streamDraft({
        stage_key: doc!.meta?.stageId ? "main" : "definition",
        intent: buildRewriteIntent(kind, selection.text),
      })) {
        draft = applyDraftEvent(draft, ev);
      }
      // 선택 영역을 결과로 교체
      editor.executeEdits("rewrite", [{ range: sel, text: draft.content }]);
      setValue(doc!.id, editor.getValue());
      autosave(editor.getValue());
    } catch {
      // 재작성 실패는 조용히 무시
    } finally {
      setRewriting(false);
      setSelection(null);
    }
  }

  if (!doc) return null;
  return (
    <div className="relative h-full">
      <MonacoEditor
        theme={theme}
        language={doc.language}
        value={doc.value}
        onMount={onMount}
        onChange={(v) => {
          const text = v ?? "";
          setValue(doc.id, text);
          autosave(text);
          inlineCheck(text);
        }}
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
      {selection && !doc.readOnly && (
        <FloatingToolbar
          top={selection.top}
          left={selection.left}
          busy={rewriting}
          onAction={(kind) => void rewrite(kind)}
        />
      )}
    </div>
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
