"""Stage 2: 정밀 심사 모듈 — 1셀(1조문×1기준)씩 LLM 판단"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from .models import ReviewMatrix, ReviewCell, Verdict, Article, Criterion, DOCUMENT_ID
from .llm_client import LLMClient

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PROMPT_PATH = PROJECT_ROOT / "pipeline" / "config" / "prompts" / "review.txt"


def _build_user_prompt(article: Article, criterion: Criterion) -> str:
    """Stage 2 심사용 사용자 프롬프트 생성"""
    # wiki 내용이 너무 길면 앞부분만 사용 (컨텍스트 제한)
    content = criterion.content
    max_chars = 15000
    if len(content) > max_chars:
        content = content[:max_chars] + "\n\n... (이하 생략)"

    return (
        f"## 조문\n"
        f"{article.id} {article.title}\n"
        f"---\n"
        f"{article.text}\n\n"
        f"## 심사 기준\n"
        f"{criterion.id}: {criterion.title}\n"
        f"---\n"
        f"{content}"
    )


def _parse_verdict(result: dict) -> tuple[Verdict | None, str | None, str | None]:
    """LLM 응답에서 verdict, reason, suggestion 추출"""
    if "error" in result:
        return None, f"LLM 오류: {result['error']}", None

    verdict_str = result.get("verdict")
    reason = result.get("reason")
    suggestion = result.get("suggestion")

    if verdict_str:
        try:
            verdict = Verdict(verdict_str)
            return verdict, reason, suggestion
        except ValueError:
            pass

    # raw 응답에서 추출 시도
    raw = result.get("raw", "")
    for v in Verdict:
        if v.value in raw:
            return v, reason or raw, suggestion

    return None, f"파싱 실패: {result}", None


async def _review_single_cell(
    cell: ReviewCell,
    article: Article,
    criterion: Criterion,
    llm: LLMClient,
    system_prompt: str,
) -> None:
    """단일 셀 심사 실행"""
    user_prompt = _build_user_prompt(article, criterion)
    result = await llm.call(system_prompt, user_prompt)

    verdict, reason, suggestion = _parse_verdict(result)
    cell.verdict = verdict
    cell.reason = reason
    cell.suggestion = suggestion


async def review_cells(
    matrix: ReviewMatrix,
    llm: LLMClient,
    checkpoint_path: Path | None = None,
    batch_size: int = 50,
) -> ReviewMatrix:
    """
    매트릭스의 모든 미심사 셀에 대해 Stage 2 정밀 심사를 실행한다.

    - stage1_relevant == False인 셀은 건너뜀
    - verdict가 이미 있는 셀도 건너뜀
    - batch_size 단위로 체크포인트 저장

    Args:
        matrix: 심사 매트릭스
        llm: LLM 클라이언트
        checkpoint_path: 중간 저장 경로
        batch_size: 체크포인트 저장 주기

    Returns:
        심사 결과가 채워진 매트릭스
    """
    system_prompt = PROMPT_PATH.read_text(encoding="utf-8")

    # 조문/기준 lookup
    article_map = {a.id: a for a in matrix.articles}
    criterion_map = {c.id: c for c in matrix.criteria}

    # 심사 대상 셀 수집
    pending_cells = matrix.gaps()
    total = len(pending_cells)
    logger.info(f"Stage 2: {total}셀 심사 시작")

    # 배치 단위로 실행
    for i in range(0, total, batch_size):
        batch = pending_cells[i:i + batch_size]
        tasks = []

        for cell in batch:
            article = article_map.get(cell.article_id)
            criterion = criterion_map.get(cell.criterion_id)
            if not article or not criterion:
                continue
            tasks.append(_review_single_cell(
                cell, article, criterion, llm, system_prompt,
            ))

        await asyncio.gather(*tasks)

        completed = min(i + batch_size, total)
        logger.info(f"  진행: {completed}/{total}")

        # 체크포인트 저장
        if checkpoint_path:
            matrix.save(checkpoint_path)

    return matrix
