"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, User, BookMarked, FileDown, Send, Landmark } from "lucide-react";

import { useUIStore } from "@/lib/store/ui-store";
import { useEditorStore } from "@/lib/store/editor-store";
import { saveMessage, saveSection, createSnapshot } from "@/server/sections";
import { listReferences } from "@/server/references";
import { toDraftReferences, type ReferenceLike } from "@/lib/references";
import { streamDraft } from "@/lib/api-client";
import {
  applyDraftEvent,
  hasNoBasis,
  initialDraftState,
} from "@/lib/chat";
import { ReferenceSearch } from "@/components/ReferenceSearch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  citations: string[];
  streaming?: boolean;
}

// 근거(citations) 토글 — 기본 접힘, 펼치면 위키 섹션 표시 (헌법 P1)
function CitationToggle({ citations }: { citations: string[] }) {
  const [open, setOpen] = useState(false);
  if (hasNoBasis(citations)) {
    // 근거 없음은 명시 표기 (FR-005a) — 지어내지 않음
    return (
      <Badge variant="outline" className="mt-2 text-amber-700 dark:text-amber-400">
        기준에 없음
      </Badge>
    );
  }
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <BookMarked className="size-3" aria-hidden />
        근거 {citations.length}건 {open ? "숨기기" : "보기"}
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5">
          {citations.map((c) => (
            <li key={c} className="text-xs text-muted-foreground">
              <code className="rounded bg-muted px-1">§{c}</code>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ChatPanel({ projectId }: { projectId: string }) {
  const activeStageId = useUIStore((s) => s.activeStageId);
  const activeStageKey = useUIStore((s) => s.activeStageKey);
  const openTab = useUIStore((s) => s.openTab);
  const upsertDocument = useEditorStore((s) => s.upsertDocument);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refs, setRefs] = useState<ReferenceLike[]>([]);
  const [refModalOpen, setRefModalOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // 첨부된 참고 조례 로드 (US7) — includedInContext 만 draft 에 전달
  useEffect(() => {
    listReferences(projectId)
      .then((rs) =>
        setRefs(
          rs.map((r) => ({
            title: r.title,
            municipality: r.municipality,
            content: r.content,
            includedInContext: r.includedInContext,
          })),
        ),
      )
      .catch(() => {});
  }, [projectId, refModalOpen]);

  const includedRefs = toDraftReferences(refs);

  async function send() {
    const intent = input.trim();
    if (!intent || busy || !activeStageKey) return;
    setError(null);
    setInput("");

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: intent,
      citations: [],
    };
    const aiId = `a-${Date.now()}`;
    setMessages((m) => [
      ...m,
      userMsg,
      { id: aiId, role: "ai", content: "", citations: [], streaming: true },
    ]);
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let draft = initialDraftState();

    try {
      for await (const ev of streamDraft(
        { stage_key: activeStageKey, intent, references: includedRefs },
        controller.signal,
      )) {
        draft = applyDraftEvent(draft, ev);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === aiId
              ? { ...msg, content: draft.content, citations: draft.citations }
              : msg,
          ),
        );
      }
      // 대화 로그 영속 — AI 메시지는 근거(citations) 추적 (헌법 P1, data-model D5)
      if (activeStageId) {
        await saveMessage({ stageId: activeStageId, role: "user", content: intent });
        await saveMessage({
          stageId: activeStageId,
          role: "ai",
          content: draft.content,
          citations: draft.citations,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 응답 실패");
    } finally {
      setMessages((m) =>
        m.map((msg) => (msg.id === aiId ? { ...msg, streaming: false } : msg)),
      );
      setBusy(false);
    }
  }

  // ⌘↵ / Ctrl+↵ 로 전송 (ui-spec §11)
  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void send();
    }
  }

  // AI 작성 결과를 에디터로 — 조문 저장 + 스냅샷 + 탭 열기 (T019, §7.6)
  async function applyToEditor(msg: ChatMessage) {
    if (!activeStageId) return;
    const docId = `stage-${activeStageId}`;
    try {
      const section = await saveSection({
        projectId,
        stageId: activeStageId,
        articleNo: 1,
        title: "(초안)",
        body: msg.content,
        order: 1,
      });
      upsertDocument({
        id: docId,
        title: "초안.md",
        value: msg.content,
        meta: {
          sectionId: section.id,
          projectId,
          stageId: activeStageId,
          articleNo: 1,
          order: 1,
        },
      });
      openTab({ id: docId, title: "초안.md" });
      // AI 응답 수용 시 시간여행 스냅샷 (§7.6)
      await createSnapshot({
        stageId: activeStageId,
        trigger: "ai_apply",
        actor: "ai",
        label: "AI 응답 적용",
        content: [{ articleNo: 1, body: msg.content }],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "에디터 적용 실패");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm font-medium">
        <Bot className="size-4 text-primary" aria-hidden />
        AI 채팅
        {activeStageKey && (
          <span className="text-xs text-muted-foreground">· {activeStageKey}</span>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto h-7"
          onClick={() => setRefModalOpen(true)}
        >
          <Landmark className="size-3.5" aria-hidden />
          참고 {includedRefs.length > 0 && `(${includedRefs.length})`}
        </Button>
      </header>

      <ReferenceSearch
        open={refModalOpen}
        onOpenChange={setRefModalOpen}
        projectId={projectId}
      />

      {/* 메시지 로그 — 스크린리더 자동 안내 (ui-spec §12) */}
      <div
        role="log"
        aria-live="polite"
        aria-label="AI 대화"
        className="flex-1 space-y-3 overflow-y-auto p-3"
      >
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            이 단계에서 작성 의도를 입력하면 AI가 조문을 작성합니다.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col",
              msg.role === "user" ? "items-end" : "items-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background",
              )}
            >
              <div className="mb-1 flex items-center gap-1 text-xs opacity-70">
                {msg.role === "user" ? (
                  <User className="size-3" aria-hidden />
                ) : (
                  <Bot className="size-3" aria-hidden />
                )}
                {msg.role === "user" ? "나" : "AI"}
              </div>
              <p className="whitespace-pre-wrap font-mono">
                {msg.content}
                {msg.streaming && <span className="animate-pulse">▋</span>}
              </p>
              {msg.role === "ai" && !msg.streaming && (
                <>
                  <CitationToggle citations={msg.citations} />
                  {msg.content && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7"
                      onClick={() => void applyToEditor(msg)}
                    >
                      <FileDown className="size-3" aria-hidden />
                      에디터에 적용
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="px-3 pb-1 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="border-t border-border p-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            activeStageKey
              ? "작성 의도를 입력하세요 (⌘↵ 전송)"
              : "먼저 단계를 선택하세요"
          }
          disabled={!activeStageKey || busy}
          rows={3}
          className="resize-none"
        />
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => void send()}
            disabled={!activeStageKey || busy || !input.trim()}
          >
            <Send className="size-3" aria-hidden />
            {busy ? "생성 중…" : "전송"}
          </Button>
        </div>
      </div>
    </div>
  );
}
