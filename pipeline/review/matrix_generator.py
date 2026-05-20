"""N×M 심사 매트릭스 생성 모듈"""

from __future__ import annotations

from .models import (
    Article, Criterion, CriterionScope,
    ReviewCell, ReviewMatrix, DOCUMENT_ID,
)


def generate_matrix(
    articles: list[Article],
    criteria: list[Criterion],
) -> ReviewMatrix:
    """
    조문 × 기준 심사 매트릭스를 생성한다.

    - document_level 기준: __DOCUMENT__와만 매칭 (1회)
    - per_article 기준: 실제 조문(제1조 등)과 각각 매칭 (N회)

    Args:
        articles: 조문 리스트 (__DOCUMENT__ 포함)
        criteria: 활성 기준 리스트

    Returns:
        모든 셀이 verdict=None으로 초기화된 ReviewMatrix
    """
    matrix = ReviewMatrix(articles=articles, criteria=criteria)

    real_articles = [a for a in articles if a.id != DOCUMENT_ID]
    doc_article = next((a for a in articles if a.id == DOCUMENT_ID), None)

    for criterion in criteria:
        if criterion.scope == CriterionScope.DOCUMENT_LEVEL:
            # 전체 문서 대상 심사 — 1회만
            if doc_article:
                matrix.add_cell(ReviewCell(
                    article_id=DOCUMENT_ID,
                    criterion_id=criterion.id,
                ))
        else:
            # 조문별 심사 — N회
            for article in real_articles:
                matrix.add_cell(ReviewCell(
                    article_id=article.id,
                    criterion_id=criterion.id,
                ))

    return matrix
