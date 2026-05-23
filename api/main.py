"""Law-Ebansimsa 무상태 compute 백엔드 (FastAPI).

DB에 접근하지 않는다 — 입력을 HTTP로 받아 계산 결과만 반환한다 (plan §1).
영속화는 web/(Prisma)가 단독 소유한다.
"""

from __future__ import annotations

from fastapi import FastAPI

from routers import draft, export, parse, search, validate

app = FastAPI(title="Law-Ebansimsa API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    """헬스체크 (T010)"""
    return {"status": "ok"}


app.include_router(draft.router)
app.include_router(validate.router)
app.include_router(parse.router)
app.include_router(search.router)
app.include_router(export.router)
