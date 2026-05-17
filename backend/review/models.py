"""심사 파이프라인 데이터 모델"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path


class CriterionScope(str, Enum):
    PER_ARTICLE = "per_article"
    DOCUMENT_LEVEL = "document_level"


class Verdict(str, Enum):
    PASS = "적합"
    FAIL = "부적합"
    NOT_APPLICABLE = "해당없음"


DOCUMENT_ID = "__DOCUMENT__"


@dataclass
class Article:
    """조례안의 개별 조문"""
    id: str          # "제1조", "제2조", ... 또는 "__DOCUMENT__"
    title: str       # "(목적)", "(정의)" 등
    text: str        # 조문 전문
    index: int       # 0부터 시작하는 순서


@dataclass
class Criterion:
    """심사 기준 (wiki 페이지 1개 = 기준 1개)"""
    id: str               # "ebansimsa/2.1.2"
    title: str            # "목적규정"
    scope: CriterionScope
    wiki_path: str        # wiki 파일 상대 경로
    content: str = ""     # 런타임에 로드되는 wiki 전문
    enabled: bool = True


@dataclass
class ReviewCell:
    """심사 매트릭스의 한 셀 (1조문 × 1기준)"""
    article_id: str
    criterion_id: str
    stage1_relevant: bool | None = None   # Stage 1 결과 (None = 미실행)
    verdict: Verdict | None = None        # Stage 2 결과
    reason: str | None = None
    suggestion: str | None = None


@dataclass
class ReviewMatrix:
    """N조문 × M기준 심사 매트릭스"""
    articles: list[Article] = field(default_factory=list)
    criteria: list[Criterion] = field(default_factory=list)
    cells: dict[str, ReviewCell] = field(default_factory=dict)

    @staticmethod
    def _cell_key(article_id: str, criterion_id: str) -> str:
        return f"{article_id}|{criterion_id}"

    def add_cell(self, cell: ReviewCell) -> None:
        key = self._cell_key(cell.article_id, cell.criterion_id)
        self.cells[key] = cell

    def get_cell(self, article_id: str, criterion_id: str) -> ReviewCell | None:
        return self.cells.get(self._cell_key(article_id, criterion_id))

    def gaps(self) -> list[ReviewCell]:
        """아직 verdict가 없고 stage1에서 제외되지 않은 셀 반환"""
        return [
            cell for cell in self.cells.values()
            if cell.verdict is None and cell.stage1_relevant is not False
        ]

    def total_cells(self) -> int:
        return len(self.cells)

    def completed_cells(self) -> int:
        return sum(
            1 for cell in self.cells.values()
            if cell.verdict is not None or cell.stage1_relevant is False
        )

    def summary(self) -> dict:
        """verdict별 개수 집계"""
        counts = {v: 0 for v in Verdict}
        counts["미심사"] = 0
        counts["해당없음(Stage1)"] = 0
        for cell in self.cells.values():
            if cell.stage1_relevant is False:
                counts["해당없음(Stage1)"] += 1
            elif cell.verdict is not None:
                counts[cell.verdict] += 1
            else:
                counts["미심사"] += 1
        return counts

    def save(self, path: Path) -> None:
        """매트릭스를 JSON으로 저장 (체크포인트)"""
        data = {
            "articles": [
                {"id": a.id, "title": a.title, "index": a.index}
                for a in self.articles
            ],
            "criteria": [
                {"id": c.id, "title": c.title, "scope": c.scope.value,
                 "wiki_path": c.wiki_path}
                for c in self.criteria
            ],
            "cells": {
                key: {
                    "article_id": cell.article_id,
                    "criterion_id": cell.criterion_id,
                    "stage1_relevant": cell.stage1_relevant,
                    "verdict": cell.verdict.value if cell.verdict else None,
                    "reason": cell.reason,
                    "suggestion": cell.suggestion,
                }
                for key, cell in self.cells.items()
            },
        }
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> ReviewMatrix:
        """JSON 체크포인트에서 매트릭스 복원"""
        data = json.loads(path.read_text(encoding="utf-8"))
        matrix = cls()
        matrix.articles = [
            Article(id=a["id"], title=a["title"], text="", index=a["index"])
            for a in data["articles"]
        ]
        matrix.criteria = [
            Criterion(
                id=c["id"], title=c["title"],
                scope=CriterionScope(c["scope"]),
                wiki_path=c["wiki_path"],
            )
            for c in data["criteria"]
        ]
        for key, cell_data in data["cells"].items():
            matrix.cells[key] = ReviewCell(
                article_id=cell_data["article_id"],
                criterion_id=cell_data["criterion_id"],
                stage1_relevant=cell_data["stage1_relevant"],
                verdict=Verdict(cell_data["verdict"]) if cell_data["verdict"] else None,
                reason=cell_data["reason"],
                suggestion=cell_data["suggestion"],
            )
        return matrix
