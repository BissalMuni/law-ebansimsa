"""국가법령정보센터 자치법규 OpenAPI 래퍼 (T029).

타 지자체 조례 검색 — 참고만 가능하고 복제는 금지된다 (헌법 P4, 강제는 draft 시스템 프롬프트에서).
fetcher를 주입 가능하게 하여 무상태·테스트 가능하게 둔다.
"""

from __future__ import annotations

import os
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

Fetcher = Callable[[str, str | None], Awaitable[dict]]


@dataclass
class SearchHit:
    """검색 결과 1건 (web의 Reference로 저장됨)"""

    title: str
    municipality: str | None = None
    source_url: str | None = None


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
        )
        for law in laws
    ]


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
