"""Pydantic 스키마 — Literal 허용값은 data-model §4 사전과 1:1 매칭한다 (헌법 III)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

# data-model §4 허용값 사전 (String enum ↔ Pydantic Literal)
ProjectKind = Literal["enact", "amend_partial", "amend_full"]
StageKey = Literal[
    "title", "purpose", "definition", "scope",
    "main", "supplementary", "review", "finalize",
]
Verdict = Literal["pass", "fail", "na", "pending"]
CriterionSource = Literal["ebansimsa", "jungbigijun"]
Severity = Literal["hint", "violation"]
ReferenceSource = Literal["file", "opendata", "paste"]


class ArticleInput(BaseModel):
    """검증 입력 조문 1건 (조 단위)"""

    article_id: str  # "제1조"
    title: str  # "목적"
    text: str  # 조문 전문


class CriterionCell(BaseModel):
    """검증 매트릭스의 기준 1개 (위키 기준은 문자열 참조 — D1)"""

    criterion_id: str  # "ebansimsa/2.1.2"
    source: CriterionSource
    title: str | None = None


class ValidationCellResult(BaseModel):
    """매트릭스 한 셀(1조문×1기준)의 판단 결과 — 헌법 P3"""

    article_id: str
    criterion_id: str
    source: CriterionSource
    verdict: Verdict
    severity: Severity
    reason: str | None = None
    suggestion: str | None = None
    dismissed_reason: str | None = None  # 무시 시 사유 강제 (P6)
