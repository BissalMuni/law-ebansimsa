"""GET /search/ordinances — 타 지자체 조례 검색 (T029, 헌법 P4 참고 전용)."""

from __future__ import annotations

from fastapi import APIRouter

from pipeline.search.opendata import search_ordinances

router = APIRouter()


@router.get("/search/ordinances")
async def search_ordinances_endpoint(query: str, region: str | None = None) -> dict:
    hits = await search_ordinances(query, region)
    return {
        "hits": [
            {"title": h.title, "municipality": h.municipality, "source_url": h.source_url}
            for h in hits
        ]
    }
