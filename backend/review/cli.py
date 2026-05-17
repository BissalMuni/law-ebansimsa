"""심사 파이프라인 CLI 진입점

사용법:
    python -m backend.review.cli 조례안.txt
    python -m backend.review.cli 조례안.txt --two-stage --concurrency 10
    python -m backend.review.cli 조례안.txt --resume checkpoint.json
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

from .article_splitter import split_ordinance
from .criteria_loader import load_criteria
from .matrix_generator import generate_matrix
from .llm_client import LLMClient
from .relevance_filter import filter_relevance
from .detailed_reviewer import review_cells
from .result_aggregator import fill_gaps, aggregate_results
from .report_generator import generate_markdown_report, generate_json_report
from .models import ReviewMatrix

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


async def run_pipeline(args: argparse.Namespace) -> None:
    """심사 파이프라인 실행"""

    # 1. 조례안 읽기 + 조문 분리
    input_path = Path(args.input)
    text = input_path.read_text(encoding="utf-8")
    articles = split_ordinance(text)
    real_articles = [a for a in articles if a.id != "__DOCUMENT__"]
    logger.info(f"[1] 조문 분리: {len(real_articles)}개 조문 + __DOCUMENT__")

    # 2. 기준 로드
    criteria = load_criteria()
    logger.info(f"[2] 기준 로드: {len(criteria)}개 활성 기준")

    # 3. 매트릭스 생성 또는 복원
    checkpoint = Path(args.resume) if args.resume else None
    if checkpoint and checkpoint.exists():
        matrix = ReviewMatrix.load(checkpoint)
        # 조문 텍스트 복원 (체크포인트에는 텍스트 미포함)
        article_map = {a.id: a for a in articles}
        for a in matrix.articles:
            if a.id in article_map:
                a.text = article_map[a.id].text
        logger.info(f"[3] 체크포인트 복원: {matrix.completed_cells()}/{matrix.total_cells()} 완료")
    else:
        matrix = generate_matrix(articles, criteria)
        checkpoint = Path(args.output).with_suffix(".checkpoint.json")
        logger.info(f"[3] 매트릭스 생성: {matrix.total_cells()}셀")

    # LLM 클라이언트
    llm = LLMClient(
        model=args.model,
        fast_model=args.fast_model,
        concurrency=args.concurrency,
    )

    # 4. Stage 1 (선택)
    if args.two_stage:
        logger.info("[4] Stage 1: 관련성 필터 시작")
        matrix = await filter_relevance(matrix, llm, checkpoint)
        remaining = sum(1 for c in matrix.cells.values() if c.stage1_relevant is not False)
        logger.info(f"    Stage 2 대상: {remaining}셀")
    else:
        logger.info("[4] Stage 1 건너뜀 (--two-stage 미지정)")

    # 5. Stage 2
    logger.info("[5] Stage 2: 정밀 심사 시작")
    matrix = await review_cells(matrix, llm, checkpoint)

    # 6. 완결성 검증 + 재실행
    logger.info("[6] 완결성 검증")
    matrix = await fill_gaps(matrix, llm, checkpoint)

    # 7. 보고서 생성
    output_path = Path(args.output)
    generate_markdown_report(matrix, output_path, input_path.stem)
    generate_json_report(matrix, output_path.with_suffix(".json"))

    results = aggregate_results(matrix)
    logger.info(f"[7] 보고서 생성: {output_path}")
    logger.info(f"    완료율: {results['completion_rate']}")
    logger.info(f"    부적합: {len(results['failures'])}건")


def main():
    parser = argparse.ArgumentParser(description="조례안 심사 파이프라인")
    parser.add_argument("input", help="조례안 텍스트 파일 경로")
    parser.add_argument("--output", default="review_report.md", help="보고서 출력 경로")
    parser.add_argument("--two-stage", action="store_true", help="2단계 필터링 (Stage 1 + 2)")
    parser.add_argument("--concurrency", type=int, default=10, help="동시 LLM 호출 수")
    parser.add_argument("--model", default="claude-sonnet-4-20250514", help="Stage 2 모델")
    parser.add_argument("--fast-model", default="claude-haiku-4-5-20251001", help="Stage 1 모델")
    parser.add_argument("--resume", help="체크포인트 JSON에서 재개")

    args = parser.parse_args()
    asyncio.run(run_pipeline(args))


if __name__ == "__main__":
    main()
