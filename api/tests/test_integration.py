"""T040 통합 — parse → validate 흐름으로 SC-003(매트릭스 전 셀 충족, P3)을 검증한다."""

from fastapi.testclient import TestClient

from main import app
from routers.validate import get_cell_judge
from schemas import ArticleInput, CriterionCell, ValidationCellResult

SAMPLE = """청년 지원 조례

제1조(목적) 이 조례는 청년의 자립을 지원함을 목적으로 한다.
제2조(정의) 이 조례에서 "청년"이란 19세 이상 39세 이하인 사람을 말한다.
"""


def _judge():
    async def judge(article: ArticleInput, criterion: CriterionCell, severity: str):
        return ValidationCellResult(
            article_id=article.article_id,
            criterion_id=criterion.criterion_id,
            source=criterion.source,
            verdict="pass",
            severity=severity,
        )

    return judge


def test_parse_then_validate_fills_every_cell_sc003():
    client = TestClient(app)

    # 1) 기존 조례 원문을 조 단위로 파싱
    parsed = client.post("/parse/ordinance", json={"content": SAMPLE}).json()["articles"]
    assert len(parsed) == 2

    # 2) 파싱된 조문 × 기준 매트릭스를 정밀 검증 — 전 셀 충족(누락 0건, P3 / SC-003)
    app.dependency_overrides[get_cell_judge] = _judge
    try:
        resp = client.post(
            "/validate/precise",
            json={
                "articles": [
                    {"article_id": a["article_label"], "title": a["title"], "text": a["body"]}
                    for a in parsed
                ],
                "criteria": [
                    {"criterion_id": "ebansimsa/2.1.2", "source": "ebansimsa"},
                    {"criterion_id": "ebansimsa/2.1.4", "source": "ebansimsa"},
                ],
            },
        )
        data = resp.json()
        assert data["total_cells"] == 4  # 2조문 × 2기준
        assert data["filled_cells"] == 4
        assert data["complete"] is True
    finally:
        app.dependency_overrides.clear()
