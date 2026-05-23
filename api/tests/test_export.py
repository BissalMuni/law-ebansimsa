"""T035 — /export DOCX/PDF 바이트 (온디맨드, blob 비영속)"""

from fastapi.testclient import TestClient

from main import app
from pipeline.export.renderer import ExportSection, render_docx, render_pdf

client = TestClient(app)

_SECTIONS = [
    {"article_label": "제1조(목적)", "title": "목적", "body": "제1조(목적) 이 조례는...", "order": 0},
    {"article_label": "제2조(정의)", "title": "정의", "body": "제2조(정의) ...", "order": 1},
]


def test_render_docx_returns_bytes():
    data = render_docx("청년 조례", "서울시", [
        ExportSection("제1조(목적)", "목적", "제1조(목적) ...", 0),
    ])
    # DOCX는 zip(PK) 시그니처로 시작
    assert data[:2] == b"PK"


def test_render_pdf_returns_bytes():
    data = render_pdf("청년 조례", "서울시", [
        ExportSection("제1조(목적)", "목적", "본문", 0),
    ])
    assert data[:4] == b"%PDF"


def test_export_endpoint_docx():
    resp = client.post("/export", json={
        "project_title": "청년 조례", "municipality": "서울시",
        "sections": _SECTIONS, "format": "docx",
    })
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith(
        "application/vnd.openxmlformats"
    )
    assert resp.content[:2] == b"PK"


def test_export_endpoint_pdf():
    resp = client.post("/export", json={
        "project_title": "청년 조례", "municipality": "서울시",
        "sections": _SECTIONS, "format": "pdf",
    })
    assert resp.status_code == 200
    assert resp.content[:4] == b"%PDF"
