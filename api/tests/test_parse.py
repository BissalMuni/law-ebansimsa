"""T026 — /parse/ordinance 조 단위 파싱"""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

SAMPLE = """청년 지원 조례

제1조(목적) 이 조례는 청년의 자립을 지원함을 목적으로 한다.
제2조(정의) 이 조례에서 "청년"이란 19세 이상 39세 이하인 사람을 말한다.
제3조(적용범위) 이 조례는 관내 거주 청년에게 적용한다.

부칙
이 조례는 공포한 날부터 시행한다.
"""


def test_parse_splits_articles():
    resp = client.post("/parse/ordinance", json={"content": SAMPLE})
    assert resp.status_code == 200
    articles = resp.json()["articles"]
    assert len(articles) == 3
    assert articles[0]["article_no"] == 1
    assert articles[0]["title"] == "목적"
    assert articles[0]["article_label"] == "제1조(목적)"
    assert articles[1]["article_no"] == 2
    assert articles[2]["order"] == 2


def test_parse_empty_returns_no_articles():
    resp = client.post("/parse/ordinance", json={"content": "조문 없음"})
    assert resp.status_code == 200
    assert resp.json()["articles"] == []
