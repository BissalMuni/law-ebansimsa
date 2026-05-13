# PDF 분석 전략

## 권장 도구: OpenDataLoader PDF (한컴)

> [GitHub](https://github.com/opendataloader-project/opendataloader-pdf) | Stars: 21.2k | License: Apache 2.0
> 벤치마크 1위 (정확도 0.907) — 읽기 순서, 테이블, 헤딩 추출 종합

한컴이 개발한 오픈소스 PDF 데이터 추출기. 2026년 3월 v2.0 공개, GitHub 트렌딩 1위 달성.

### 설치

```bash
pip install -U opendataloader-pdf

# 고급 기능 (OCR, 수식 등)
pip install -U "opendataloader-pdf[hybrid]"
```

### 핵심 기능

| 기능 | 설명 |
|------|------|
| 텍스트 추출 | 올바른 읽기 순서 보장 |
| 테이블 추출 | 병합 셀, 중첩 테이블, 경계선 없는 표 지원 |
| 헤딩 계층 감지 | 자동 목차 구조 파악 |
| OCR | 스캔 PDF 지원 (80+ 언어, 한국어 포함) |
| 수식 추출 | LaTeX 변환 |
| 차트/이미지 | AI 기반 설명 생성 |
| Bounding Box | 모든 요소에 좌표 제공 |

### 출력 포맷

| 포맷 | 용도 |
|------|------|
| **Markdown** | LLM 컨텍스트, RAG 청킹에 최적 |
| **JSON** | 바운딩 박스 + 시맨틱 타입 포함 구조화 데이터 |
| **HTML** | 웹 표시 |
| **Annotated PDF** | 감지된 구조 시각적 디버깅 |

### 기본 사용법

```python
import opendataloader_pdf

opendataloader_pdf.convert(
    input_path=["2022 ebansimsa.pdf", "2025 jungbigijun.pdf"],
    output_dir="output/",
    format="markdown,json"
)
```

```bash
# CLI
opendataloader-pdf "2022 ebansimsa.pdf" "2025 jungbigijun.pdf"
```

### LangChain 연동

```bash
pip install -U langchain-opendataloader-pdf
```

```python
from langchain_opendataloader_pdf import OpenDataLoaderPDFLoader

loader = OpenDataLoaderPDFLoader(
    file_path=["2022 ebansimsa.pdf"],
    format="text"
)
documents = loader.load()
```

---

## 기존 도구 (대안)

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| PyMuPDF (fitz) | 1.27.1 | 빠른 텍스트 추출 (단순 구조) |
| pdfplumber | 0.11.9 | 테이블 추출 |
| pypdf | 6.11.0 | 기본 텍스트/메타데이터 |
| pdfminer.six | — | 레이아웃 기반 추출 |

---

## 파싱 파이프라인

```
PDF 원본 (Raw Source)
    │
    ▼
[1단계] OpenDataLoader로 마크다운 + JSON 변환
    │
    ▼
[2단계] 헤딩 계층으로 자동 목차 생성 → toc.md
    │
    ▼
[3단계] 섹션별 분할 (헤딩 기준)
    │
    ▼
[4단계] 위키 페이지 생성 (LLM이 구조화)
    │
    ▼
[5단계] index.md 업데이트 + 상호참조
```

## 구현 스크립트 (예정)

`scripts/parse_pdf.py` — OpenDataLoader 기반 PDF → 섹션별 마크다운 변환
