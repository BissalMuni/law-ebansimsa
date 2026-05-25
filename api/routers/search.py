"""GET /search/ordinances — 타 지자체 조례 검색 (T029, 헌법 P4 참고 전용)."""

from __future__ import annotations

from fastapi import APIRouter

from pipeline.search.opendata import fetch_ordinance_content, search_ordinances

router = APIRouter()


@router.get("/search/ordinances")
async def search_ordinances_endpoint(query: str, region: str | None = None) -> dict:
    hits = await search_ordinances(query, region)
    return {
        "hits": [
            {
                "title": h.title,
                "municipality": h.municipality,
                "source_url": h.source_url,
                "id": h.ordinance_id,
            }
            for h in hits
        ]
    }


@router.get("/search/ordinances/content")
async def ordinance_content_endpoint(id: str) -> dict:
    """자치법규 일련번호로 본문 원문을 자동 로드한다 (개정 입안용, 헌법 P4 참고)."""
    content = await fetch_ordinance_content(id)
    return {"content": content}
