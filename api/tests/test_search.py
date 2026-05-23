"""T029 — /search/ordinances OpenAPI 파싱 (모의 fetcher)"""

from pipeline.search.opendata import parse_search_response, search_ordinances


def test_parse_search_response_extracts_hits():
    raw = {
        "OrdinSearch": {
            "law": [
                {"자치법규명": "청년 지원 조례", "지자체기관명": "서울특별시",
                 "자치법규상세링크": "http://law.go.kr/x"},
            ]
        }
    }
    hits = parse_search_response(raw)
    assert len(hits) == 1
    assert hits[0].title == "청년 지원 조례"
    assert hits[0].municipality == "서울특별시"


async def test_search_ordinances_with_injected_fetcher():
    async def fake_fetch(query, region):
        return {"OrdinSearch": {"law": {"자치법규명": "테스트 조례"}}}

    hits = await search_ordinances("청년", fetcher=fake_fetch)
    assert len(hits) == 1
    assert hits[0].title == "테스트 조례"
