"""T016 — /draft/generate SSE + 시스템 프롬프트 P1·P4 검증"""

from collections.abc import AsyncIterator

from fastapi.testclient import TestClient

from main import app
from pipeline.draft.generator import (
    DraftRequest,
    ReferenceContext,
    WikiGrounding,
    build_system_prompt,
    collect_citations,
    NO_BASIS_TOKEN,
)
from routers.draft import get_streamer


async def _fake_streamer(system: str, user: str) -> AsyncIterator[str]:
    for chunk in ["제1조", "(목적) ", "이 조례는..."]:
        yield chunk


def test_build_prompt_injects_grounding_p1():
    req = DraftRequest(
        stage_key="purpose",
        intent="목적 조문",
        groundings=[WikiGrounding(criterion_id="ebansimsa/2.1.2", content="목적규정 작성법")],
    )
    prompt = build_system_prompt(req)
    assert "ebansimsa/2.1.2" in prompt
    assert "목적규정 작성법" in prompt
    assert NO_BASIS_TOKEN in prompt  # 근거 없는 내용 표기 강제 (FR-005a)


def test_build_prompt_no_grounding_forces_no_basis_token():
    req = DraftRequest(stage_key="purpose", intent="목적", groundings=[])
    prompt = build_system_prompt(req)
    assert NO_BASIS_TOKEN in prompt


def test_build_prompt_injects_no_copy_p4():
    req = DraftRequest(
        stage_key="main",
        intent="본칙",
        references=[ReferenceContext(title="A시 조례", content="제1조...")],
    )
    prompt = build_system_prompt(req)
    assert "복사하지" in prompt or "복제" in prompt  # P4 복제 금지


def test_collect_citations():
    req = DraftRequest(
        stage_key="purpose", intent="x",
        groundings=[WikiGrounding(criterion_id="ebansimsa/2.1.2")],
    )
    assert collect_citations(req) == ["ebansimsa/2.1.2"]


def test_draft_generate_sse_streams_citations_and_deltas():
    app.dependency_overrides[get_streamer] = lambda: _fake_streamer
    try:
        client = TestClient(app)
        with client.stream(
            "POST", "/draft/generate",
            json={"stage_key": "purpose", "intent": "목적 조문",
                  "wiki_refs": [{"criterion_id": "ebansimsa/2.1.2"}]},
        ) as resp:
            assert resp.status_code == 200
            body = "".join(resp.iter_text())
        assert "citations" in body
        assert "ebansimsa/2.1.2" in body
        assert "제1조" in body
        assert "[DONE]" in body
    finally:
        app.dependency_overrides.clear()
