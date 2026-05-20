"""Stage 1: 해당 여부 필터 모듈 — 빠른 모델로 관련성 판단"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from .models import ReviewMatrix, ReviewCell, Article, Criterion
from .llm_client import LLMClient

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROMPT_PATH = PROJECT_ROOT / "pipeline" / "config" / "prompts" / "relevance.txt"


def _build_relevance_prompt(article: Article, criterion: Criterion) -> str:
    """Stage 1 관련성 판단 프롬프트 (간결하게)"""
    # 비용 절감: 기준 제목만 사용 (전문 포함 안 함)
    article_preview = article.text[:500] if len(article.text) > 500 else article.text
    return (
        f"## Article\n"
        f"{article.id}: {article.title}\n"
        f"{article_preview}\n\n"
        f"## Criterion\n"
        f"{criterion.id}: {criterion.title}"
    )


async def _filter_single_cell(
    cell: ReviewCell,
    article: Article,
    criterion: Criterion,
    llm: LLMClient,
    system_prompt: str,
) -> None:
    """단일 셀 관련성 판단"""
    user_prompt = _build_relevance_prompt(article, criterion)
    result = await llm.call(system_prompt, user_prompt, use_fast=True, max_tokens=8)

    raw = result.get("raw", str(result))
    cell.stage1_relevant = "yes" in raw.lower()


async def filter_relevance(
    matrix: ReviewMatrix,
    llm: LLMClient,
    checkpoint_path: Path | None = None,
    batch_size: int = 100,
) -> ReviewMatrix:
    """
    매트릭스의 모든 셀에 대해 Stage 1 관련성 필터를 실행한다.

    결과: cell.stage1_relevant = True/False

    Args:
        matrix: 심사 매트릭스
        llm: LLM 클라이언트
        checkpoint_path: 중간 저장 경로
        batch_size: 배치 크기

    Returns:
        stage1_relevant가 채워진 매트릭스
    """
    system_prompt = PROMPT_PATH.read_text(encoding="utf-8")

    article_map = {a.id: a for a in matrix.articles}
    criterion_map = {c.id: c for c in matrix.criteria}

    # stage1 미실행 셀만 대상
    pending = [c for c in matrix.cells.values() if c.stage1_relevant is None]
    total = len(pending)
    logger.info(f"Stage 1: {total}셀 관련성 필터 시작")

    for i in range(0, total, batch_size):
        batch = pending[i:i + batch_size]
        tasks = []

        for cell in batch:
            article = article_map.get(cell.article_id)
            criterion = criterion_map.get(cell.criterion_id)
            if not article or not criterion:
                continue
            tasks.append(_filter_single_cell(
                cell, article, criterion, llm, system_prompt,
            ))

        await asyncio.gather(*tasks)

        completed = min(i + batch_size, total)
        relevant = sum(1 for c in pending[:completed] if c.stage1_relevant)
        logger.info(f"  진행: {completed}/{total} (관련: {relevant})")

        if checkpoint_path:
            matrix.save(checkpoint_path)

    relevant_total = sum(1 for c in matrix.cells.values() if c.stage1_relevant)
    filtered = total - relevant_total
    logger.info(f"Stage 1 완료: {relevant_total}셀 관련, {filtered}셀 제외")

    return matrix
