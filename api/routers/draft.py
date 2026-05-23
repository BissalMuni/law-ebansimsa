"""POST /draft/generate (SSE) — 단계별 조문 작성 스트림 + citations (T016).

헌법 P1(근거 추적)·P4(복제 금지)는 pipeline.draft.generator가 시스템 프롬프트로 강제한다.
무상태: DB 접근 없음. citations를 함께 흘려 web이 Message.citations로 저장한다.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from pipeline.draft.generator import (
    DraftRequest,
    ReferenceContext,
    WikiGrounding,
    build_system_prompt,
    collect_citations,
)

router = APIRouter()


class WikiRefInput(BaseModel):
    criterion_id: str
    content: str = ""


class DraftGenerateRequest(BaseModel):
    """HTTP 요청 바디 — wiki_refs를 DraftRequest.groundings로 매핑한다."""

    stage_key: str
    intent: str
    wiki_refs: list[WikiRefInput] = Field(default_factory=list)
    references: list[ReferenceContext] = Field(default_factory=list)

    def to_draft_request(self) -> DraftRequest:
        return DraftRequest(
            stage_key=self.stage_key,
            intent=self.intent,
            groundings=[
                WikiGrounding(criterion_id=r.criterion_id, content=r.content)
                for r in self.wiki_refs
            ],
            references=self.references,
        )


# 실제 LLM 스트리머 — anthropic 클라이언트는 호출 시점에 지연 생성한다.
# (테스트는 get_streamer를 의존성 오버라이드로 가짜 스트리머로 교체한다)
def get_streamer():
    async def streamer(system: str, user: str) -> AsyncIterator[str]:
        import anthropic

        client = anthropic.AsyncAnthropic()
        async with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=system,
            messages=[{"role": "user", "content": user}],
        ) as stream:
            async for text in stream.text_stream:
                yield text

    return streamer


def _sse(data: str) -> str:
    return f"data: {data}\n\n"


@router.post("/draft/generate")
async def draft_generate(
    body: DraftGenerateRequest,
    streamer=Depends(get_streamer),
) -> StreamingResponse:
    req = body.to_draft_request()
    system = build_system_prompt(req)
    citations = collect_citations(req)

    async def event_stream() -> AsyncIterator[str]:
        # 먼저 근거(citations)를 흘려 web이 Message.citations로 저장하게 한다 (P1)
        yield _sse(json.dumps({"type": "citations", "citations": citations}, ensure_ascii=False))
        async for chunk in streamer(system, req.intent):
            yield _sse(json.dumps({"type": "delta", "text": chunk}, ensure_ascii=False))
        yield _sse("[DONE]")

    return StreamingResponse(event_stream(), media_type="text/event-stream")
