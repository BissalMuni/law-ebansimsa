"""T029 — /search/ordinances OpenAPI 파싱 (모의 fetcher)"""

from pipeline.search.opendata import (
    fetch_ordinance_content,
    parse_ordinance_content,
    parse_search_response,
    search_ordinances,
)


def test_parse_search_response_extracts_hits():
    raw = {
        "OrdinSearch": {
            "law": [
                {"자치법규명": "청년 지원 조례", "지자체기관명": "서울특별시",
                 "자치법규상세링크": "http://law.go.kr/x", "자치법규일련번호": "12345"},
            ]
        }
    }
    hits = parse_search_response(raw)
    assert len(hits) == 1
    assert hits[0].title == "청년 지원 조례"
    assert hits[0].municipality == "서울특별시"
    assert hits[0].ordinance_id == "12345"


async def test_search_ordinances_with_injected_fetcher():
    async def fake_fetch(query, region):
        return {"OrdinSearch": {"law": {"자치법규명": "테스트 조례"}}}

    hits = await search_ordinances("청년", fetcher=fake_fetch)
    assert len(hits) == 1
    assert hits[0].title == "테스트 조례"


def test_parse_ordinance_content_concatenates_articles():
    # 실제 lawService.do(target=ordin) 응답 형태: LawService.조문.조[].조내용
    raw = {
        "LawService": {
            "조문": {
                "조": [
                    {"조제목": "목적", "조내용": "제1조(목적) 이 조례는 ...을 목적으로 한다."},
                    {"조제목": "정의", "조내용": "제2조(정의) 이 조례에서 ...라 한다."},
                ]
            }
        }
    }
    text = parse_ordinance_content(raw)
    assert "제1조(목적)" in text
    assert "제2조(정의)" in text
    # 조가 줄바꿈으로 분리돼 web 의 /parse/ordinance 가 다시 쪼갤 수 있다
    assert text.count("\n") >= 1


def test_parse_ordinance_content_supports_legacy_keys_and_clauses():
    # 구버전/변형 응답(조문단위·조문내용·항)도 방어적으로 지원
    raw = {
        "조문": {
            "조문단위": [
                {"조문내용": "제1조(목적)", "항": [{"항내용": '① "청년"이란 ...'}]},
            ]
        }
    }
    text = parse_ordinance_content(raw)
    assert "제1조(목적)" in text
    assert '① "청년"이란' in text


def test_parse_ordinance_content_tolerates_missing_articles():
    assert parse_ordinance_content({"LawService": {}}) == ""


async def test_fetch_ordinance_content_with_injected_fetcher():
    async def fake_fetch(ordinance_id):
        assert ordinance_id == "12345"
        return {"LawService": {"조문": {"조": {"조내용": "제1조(목적) ..."}}}}

    text = await fetch_ordinance_content("12345", fetcher=fake_fetch)
    assert text == "제1조(목적) ..."
