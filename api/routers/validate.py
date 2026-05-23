"""검증 매트릭스 — 스크립트가 셀(조문×기준)을 강제 생성하고 LLM은 1회 1셀만 판단한다 (헌법 P3).

POST /validate/precise (T020) — 단계 확정 시 정밀 검증, 전 셀 충족 검증
POST /validate/inline  (T031) — 작성 중 가벼운 힌트 (Haiku)
무상태: 위키 기준은 문자열(criterion_id)로만 참조한다 (D1).
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from schemas import ArticleInput, CriterionCell, ValidationCellResult

router = APIRouter()

CellJudge = Callable[[ArticleInput, CriterionCell, str], Awaitable[ValidationCellResult]]

# verdict가 채워졌다고 인정하는 값 (pending은 미충족 — P3 누락 0건)
_FILLED_VERDICTS = {"pass", "fail", "na"}


def get_cell_judge() -> CellJudge:
    """실제 LLM 셀 판단기 — 1조문×1기준만 받는다 (P3). 테스트는 가짜로 오버라이드한다."""

    async def judge(
        article: ArticleInput, criterion: CriterionCell, severity: str
    ) -> ValidationCellResult:
        from pipeline.review.llm_client import LLMClient

        client = LLMClient()
        system = (
            "당신은 조례 심사자다. 단 하나의 조문을 단 하나의 기준으로만 판단하라.\n"
            f"기준: {criterion.criterion_id} ({criterion.title or ''})"
        )
        user = f"[{article.article_id} {article.title}]\n{article.text}"
        result = await client.call(system, user, use_fast=(severity == "hint"))
        verdict = result.get("verdict", "pending") if isinstance(result, dict) else "pending"
        if verdict not in {"pass", "fail", "na", "pending"}:
            verdict = "pending"
        return ValidationCellResult(
            article_id=article.article_id,
            criterion_id=criterion.criterion_id,
            source=criterion.source,
            verdict=verdict,
            severity=severity,  # type: ignore[arg-type]
            reason=result.get("reason") if isinstance(result, dict) else None,
            suggestion=result.get("suggestion") if isinstance(result, dict) else None,
        )

    return judge


class PreciseRequest(BaseModel):
    articles: list[ArticleInput]
    criteria: list[CriterionCell]


class PreciseResponse(BaseModel):
    results: list[ValidationCellResult]
    total_cells: int
    filled_cells: int
    complete: bool


@router.post("/validate/precise", response_model=PreciseResponse)
async def validate_precise(
    body: PreciseRequest, judge: CellJudge = Depends(get_cell_judge)
) -> PreciseResponse:
    # 스크립트가 매트릭스를 강제 생성: 모든 (조문 × 기준) 셀을 셀 단위로 호출 (P3)
    results: list[ValidationCellResult] = []
    for article in body.articles:
        for criterion in body.criteria:
            results.append(await judge(article, criterion, "violation"))

    total = len(body.articles) * len(body.criteria)
    filled = sum(1 for r in results if r.verdict in _FILLED_VERDICTS)
    return PreciseResponse(
        results=results,
        total_cells=total,
        filled_cells=filled,
        complete=(total > 0 and filled == total),  # 전 셀 충족 검증 (누락 0건)
    )


class InlineRequest(BaseModel):
    article: ArticleInput
    criteria: list[CriterionCell] = Field(default_factory=list)


class InlineResponse(BaseModel):
    hints: list[ValidationCellResult]


@router.post("/validate/inline", response_model=InlineResponse)
async def validate_inline(
    body: InlineRequest, judge: CellJudge = Depends(get_cell_judge)
) -> InlineResponse:
    # 작성 중 가벼운 단일 힌트. 기준 미지정 시 관련성 기준 1개로 평가한다.
    criterion = body.criteria[0] if body.criteria else CriterionCell(
        criterion_id="relevance", source="ebansimsa", title="관련성"
    )
    hint = await judge(body.article, criterion, "hint")
    return InlineResponse(hints=[hint])
