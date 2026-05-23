"""T010 — /health 헬스체크"""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_cors_allows_web_origin():
    """web(브라우저)에서 api 를 호출할 수 있도록 CORS 허용 헤더가 응답에 포함된다 (T010)"""
    origin = "http://localhost:3000"
    resp = client.get("/health", headers={"Origin": origin})
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == origin


def test_cors_preflight_allows_post():
    """SSE/POST 호출 전 프리플라이트(OPTIONS)를 허용한다 (web↔api 유일 경계, plan §1)"""
    resp = client.options(
        "/draft/generate",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert resp.status_code in (200, 204)
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"
