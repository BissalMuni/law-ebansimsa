"""T020/T031/T034 — 검증 매트릭스 P3 (셀 단위·전 셀 충족) + P6 사유"""

from fastapi.testclient import TestClient

from main import app
from routers.validate import get_cell_judge, get_relevance_filter
from schemas import ArticleInput, CriterionCell, ValidationCellResult


def _fake_judge_factory(verdict="pass"):
    calls = []

    async def judge(article: ArticleInput, criterion: CriterionCell, severity: str):
        # P3 — 1조문×1기준만 받는지 호출 단위로 검증
        calls.append((article.article_id, criterion.criterion_id))
        return ValidationCellResult(
            article_id=article.article_id,
            criterion_id=criterion.criterion_id,
            source=criterion.source,
            verdict=verdict,
            severity=severity,
            reason="ok",
        )

    judge.calls = calls
    return judge


def test_precise_fills_every_cell_p3():
    judge = _fake_judge_factory("pass")
    app.dependency_overrides[get_cell_judge] = lambda: judge
    try:
        client = TestClient(app)
        resp = client.post("/validate/precise", json={
            "articles": [
                {"article_id": "제1조", "title": "목적", "text": "..."},
                {"article_id": "제2조", "title": "정의", "text": "..."},
            ],
            "criteria": [
                {"criterion_id": "ebansimsa/2.1.2", "source": "ebansimsa", "title": "목적규정"},
                {"criterion_id": "ebansimsa/2.1.4", "source": "ebansimsa", "title": "정의규정"},
            ],
        })
        assert resp.status_code == 200
        data = resp.json()
        # 2조문 × 2기준 = 4셀, 전 셀 채워짐 (누락 0건 — P3)
        assert data["total_cells"] == 4
        assert data["filled_cells"] == 4
        assert data["complete"] is True
        assert len(judge.calls) == 4  # 셀 단위 호출 강제
    finally:
        app.dependency_overrides.clear()


def test_precise_incomplete_when_pending():
    judge = _fake_judge_factory("pending")
    app.dependency_overrides[get_cell_judge] = lambda: judge
    try:
        client = TestClient(app)
        resp = client.post("/validate/precise", json={
            "articles": [{"article_id": "제1조", "title": "목적", "text": "..."}],
            "criteria": [{"criterion_id": "ebansimsa/2.1.2", "source": "ebansimsa"}],
        })
        data = resp.json()
        assert data["complete"] is False  # pending은 미충족
    finally:
        app.dependency_overrides.clear()


def test_full_matrix_complete_p3():
    """전체 검토(Stage 7) — 전 셀 채워짐 (누락 0건, P3)"""
    judge = _fake_judge_factory("pass")
    app.dependency_overrides[get_cell_judge] = lambda: judge
    try:
        client = TestClient(app)
        resp = client.post("/validate/full", json={
            "articles": [
                {"article_id": "제1조", "title": "목적", "text": "..."},
                {"article_id": "제2조", "title": "정의", "text": "..."},
            ],
            "criteria": [
                {"criterion_id": "ebansimsa/2.1.2", "source": "ebansimsa"},
                {"criterion_id": "ebansimsa/2.1.4", "source": "ebansimsa"},
            ],
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_cells"] == 4
        assert data["filled_cells"] == 4
        assert data["complete"] is True
    finally:
        app.dependency_overrides.clear()


def test_full_two_stage_skips_irrelevant_cells():
    """2단계: 관련성 없는 셀은 LLM 상세 판단 없이 na 로 채운다 (review --two-stage)"""
    judge = _fake_judge_factory("fail")
    # 첫 기준만 관련 있다고 표시 — 나머지는 상세 판단 생략
    def only_first(article: ArticleInput, criterion: CriterionCell) -> bool:
        return criterion.criterion_id.endswith("2.1.2")

    app.dependency_overrides[get_cell_judge] = lambda: judge
    app.dependency_overrides[get_relevance_filter] = lambda: only_first
    try:
        client = TestClient(app)
        resp = client.post("/validate/full", json={
            "articles": [{"article_id": "제1조", "title": "목적", "text": "..."}],
            "criteria": [
                {"criterion_id": "ebansimsa/2.1.2", "source": "ebansimsa"},
                {"criterion_id": "ebansimsa/2.1.4", "source": "ebansimsa"},
            ],
        })
        data = resp.json()
        # 전 셀(2개) 채워짐 — 관련 1 + na 1
        assert data["total_cells"] == 2
        assert data["filled_cells"] == 2
        assert data["complete"] is True
        # 상세 판단(judge)은 관련 셀에만 호출 (효율 — 2단계)
        assert len(judge.calls) == 1
        verdicts = {r["criterion_id"]: r["verdict"] for r in data["results"]}
        assert verdicts["ebansimsa/2.1.2"] == "fail"
        assert verdicts["ebansimsa/2.1.4"] == "na"
    finally:
        app.dependency_overrides.clear()


def test_inline_returns_single_hint():
    judge = _fake_judge_factory("fail")
    app.dependency_overrides[get_cell_judge] = lambda: judge
    try:
        client = TestClient(app)
        resp = client.post("/validate/inline", json={
            "article": {"article_id": "제1조", "title": "목적", "text": "..."},
        })
        assert resp.status_code == 200
        hints = resp.json()["hints"]
        assert len(hints) == 1
        assert hints[0]["severity"] == "hint"
    finally:
        app.dependency_overrides.clear()
