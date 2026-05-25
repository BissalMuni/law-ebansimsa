"""Law-Ebansimsa 무상태 compute 백엔드 (FastAPI).

DB에 접근하지 않는다 — 입력을 HTTP로 받아 계산 결과만 반환한다 (plan §1).
영속화는 web/(Prisma)가 단독 소유한다.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# .env.local 을 가장 먼저 로드 — LAW_OPENAPI_OC 등 비밀값을 os.environ 에 주입한다.
# routers import 가 환경변수를 읽기 전에 실행돼야 하므로 최상단에 둔다 (git 추적 제외).
load_dotenv(Path(__file__).parent / ".env.local")

from routers import draft, export, parse, search, validate  # noqa: E402

app = FastAPI(title="Law-Ebansimsa API", version="0.1.0")

# web(Next.js)에서 api 를 호출하는 유일한 경계 (plan §1). 로컬 단일 사용자라 origin 만 허용.
# 추가 origin 은 WEB_ORIGINS(쉼표 구분) 환경변수로 확장 가능.
_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_web_origins = [
    o.strip()
    for o in os.environ.get("WEB_ORIGINS", _default_origins).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_web_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    """헬스체크 (T010)"""
    return {"status": "ok"}


app.include_router(draft.router)
app.include_router(validate.router)
app.include_router(parse.router)
app.include_router(search.router)
app.include_router(export.router)
