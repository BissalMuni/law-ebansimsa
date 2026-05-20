"""결과 집계 및 완결성 검증 모듈"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from .models import ReviewMatrix, Verdict
from .llm_client import LLMClient
from .detailed_reviewer import review_cells

logger = logging.getLogger(__name__)


def verify_completeness(matrix: ReviewMatrix) -> list[str]:
    """
    verdict가 없고 stage1에서 제외되지 않은 셀 목록 반환.

    Returns:
        미완료 셀 키 리스트 (비어있으면 완결)
    """
    gaps = matrix.gaps()
    return [f"{cell.article_id}|{cell.criterion_id}" for cell in gaps]


async def fill_gaps(
    matrix: ReviewMatrix,
    llm: LLMClient,
    checkpoint_path: Path | None = None,
    max_retries: int = 3,
) -> ReviewMatrix:
    """
    미완료 셀을 재실행하여 매트릭스를 완성한다.

    최대 max_retries회 반복. 매 라운드 후 완결성 재검증.
    """
    for attempt in range(max_retries):
        gaps = verify_completeness(matrix)
        if not gaps:
            logger.info("매트릭스 100% 완결")
            return matrix

        logger.warning(f"미완료 {len(gaps)}셀 발견, 재실행 (시도 {attempt + 1}/{max_retries})")
        matrix = await review_cells(matrix, llm, checkpoint_path)

    # 최종 확인
    remaining = verify_completeness(matrix)
    if remaining:
        logger.error(f"최종 미완료 {len(remaining)}셀: {remaining[:5]}...")
    else:
        logger.info("매트릭스 100% 완결")

    return matrix


def aggregate_results(matrix: ReviewMatrix) -> dict:
    """심사 결과 요약 통계 생성"""
    summary = matrix.summary()

    # 부적합 항목 상세
    failures = []
    for cell in matrix.cells.values():
        if cell.verdict == Verdict.FAIL:
            failures.append({
                "article_id": cell.article_id,
                "criterion_id": cell.criterion_id,
                "reason": cell.reason,
                "suggestion": cell.suggestion,
            })

    return {
        "total_cells": matrix.total_cells(),
        "completed": matrix.completed_cells(),
        "summary": {k.value if hasattr(k, 'value') else k: v for k, v in summary.items()},
        "failures": sorted(failures, key=lambda x: x["article_id"]),
        "completion_rate": f"{matrix.completed_cells() / max(matrix.total_cells(), 1) * 100:.1f}%",
    }
