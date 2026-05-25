"""국가법령정보센터 자치법규 OpenAPI 래퍼 (T029).

타 지자체 조례 검색 — 참고만 가능하고 복제는 금지된다 (헌법 P4, 강제는 draft 시스템 프롬프트에서).
fetcher를 주입 가능하게 하여 무상태·테스트 가능하게 둔다.
"""

from __future__ import annotations

import os
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

Fetcher = Callable[[str, str | None], Awaitable[dict]]
ContentFetcher = Callable[[str], Awaitable[dict]]


@dataclass
class SearchHit:
    """검색 결과 1건 (web의 Reference로 저장됨)"""

    title: str
    municipality: str | None = None
    source_url: str | None = None
    ordinance_id: str | None = None  # 자치법규일련번호(MST) — 본문 조회 키


def _as_list(value) -> list:
    """OpenAPI는 결과 1건이면 dict, 여러 건이면 list로 준다 — 항상 list로 정규화."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def parse_search_response(raw: dict) -> list[SearchHit]:
    """OpenAPI 응답에서 검색 결과 목록을 추출한다."""
    laws = _as_list(raw.get("OrdinSearch", {}).get("law"))
    return [
        SearchHit(
            title=law.get("자치법규명", ""),
            municipality=law.get("지자체기관명"),
            source_url=law.get("자치법규상세링크"),
            ordinance_id=law.get("자치법규일련번호"),
        )
        for law in laws
    ]


# 본문 응답의 조 리스트 키 — 실제는 '조', 일부 응답은 '조문단위' (둘 다 방어)
_ARTICLE_LIST_KEYS = ("조", "조문단위")
# 조 본문 내용 키 — 실제는 '조내용', 일부는 '조문내용'
_ARTICLE_BODY_KEYS = ("조내용", "조문내용")


def _find_articles(node: object) -> list:
    """본문 응답 JSON 어디에 있든 조 리스트를 찾아 반환한다 (구조 변동 방어)."""
    if isinstance(node, dict):
        for key in _ARTICLE_LIST_KEYS:
            if key in node:
                return _as_list(node[key])
        for value in node.values():
            found = _find_articles(value)
            if found:
                return found
    return []


def parse_ordinance_content(raw: dict) -> str:
    """자치법규 본문 응답에서 조문 텍스트를 평문으로 추출한다.

    각 조내용("제N조(제목) ...")을 줄바꿈으로 이어 붙여, web의 /parse/ordinance 가
    다시 조 단위로 분리할 수 있는 원문 문자열을 만든다.
    """
    lines: list[str] = []
    for article in _find_articles(raw):
        if not isinstance(article, dict):
            continue
        body = next(
            (article[k].strip() for k in _ARTICLE_BODY_KEYS if article.get(k)),
            "",
        )
        if body:
            lines.append(body)
        # 일부 응답은 항을 별도로 분리해 준다 — 있으면 함께 보존
        for clause in _as_list(article.get("항")):
            if isinstance(clause, dict):
                text = (clause.get("항내용") or "").strip()
                if text:
                    lines.append(text)
    return "\n".join(lines)


async def _default_content_fetcher(ordinance_id: str) -> dict:
    """국가법령정보센터 자치법규 본문 조회 (lawService.do, httpx)."""
    import httpx

    params = {
        "OC": os.environ.get("LAW_OPENAPI_OC", ""),
        "target": "ordin",
        "type": "json",
        "MST": ordinance_id,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get("http://www.law.go.kr/DRF/lawService.do", params=params)
        resp.raise_for_status()
        return resp.json()


async def fetch_ordinance_content(
    ordinance_id: str,
    *,
    fetcher: ContentFetcher | None = None,
) -> str:
    """자치법규 일련번호로 본문 원문을 가져온다. fetcher 주입 시 그것을 사용한다 (테스트·무상태)."""
    fetch = fetcher or _default_content_fetcher
    raw = await fetch(ordinance_id)
    return parse_ordinance_content(raw)


async def _default_fetcher(query: str, region: str | None) -> dict:
    """국가법령정보센터 OpenAPI 실제 호출 (httpx)."""
    import httpx

    params = {
        "OC": os.environ.get("LAW_OPENAPI_OC", ""),
        "target": "ordin",
        "type": "json",
        "query": query,
    }
    if region:
        params["region"] = region
    async with httpx.AsyncClient() as client:
        resp = await client.get("http://www.law.go.kr/DRF/lawSearch.do", params=params)
        resp.raise_for_status()
        return resp.json()


async def search_ordinances(
    query: str,
    region: str | None = None,
    *,
    fetcher: Fetcher | None = None,
) -> list[SearchHit]:
    """타 지자체 조례를 검색한다. fetcher 주입 시 그것을 사용한다 (테스트·무상태)."""
    fetch = fetcher or _default_fetcher
    raw = await fetch(query, region)
    return parse_search_response(raw)
