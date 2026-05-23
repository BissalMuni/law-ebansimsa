"""T010 — /health 헬스체크"""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
