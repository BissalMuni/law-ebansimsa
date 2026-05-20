# 심사 파이프라인 구조

> 조례안 자동 심사 시스템의 전체 아키텍처와 단계별 동작 설명

## 핵심 원칙

- **매트릭스 강제**: 스크립트가 N조문 × M기준 매트릭스를 생성하고, LLM은 1회에 1조문×1기준만 판단
- **누락 방지**: LLM이 효율성을 추구하여 기준을 뭉뚱그리거나 누락하는 것을 구조적으로 차단
- **완전성 검증**: 매트릭스 모든 셀이 채워질 때까지 재시도

## 전체 흐름

```
조례안 텍스트 입력
    ↓
[1] 조문 분리 (article_splitter.py)
    ↓
[2] 심사 기준 로딩 (criteria_loader.py) ← wiki 지식베이스
    ↓
[3] N×M 매트릭스 생성 (matrix_generator.py)
    ↓
[4] Stage 1: 관련성 필터 (relevance_filter.py) — Haiku
    ↓
[5] Stage 2: 정밀 심사 (detailed_reviewer.py) — Sonnet
    ↓
[6] 완전성 검증 & 갭 재시도 (result_aggregator.py)
    ↓
[7] 보고서 생성 (report_generator.py) — MD + JSON
```

## 단계별 상세

### [1] 조문 분리 — `article_splitter.py`

- 조례안을 개별 조문으로 분리 (정규식: `^제\d+조(?:의\d+)?`)
- 전체 문서 수준 기준을 위한 `__DOCUMENT__` 가상 조문 생성
- 부칙·별표도 별도 조문으로 보존

### [2] 심사 기준 로딩 — `criteria_loader.py`

- `pipeline/config/criteria_registry.json`에서 활성화된 기준 로딩
- 각 기준 = wiki 지식베이스의 1페이지
- 기준 범위 자동 분류:
  - **DOCUMENT_LEVEL**: `__DOCUMENT__`에만 적용 (1회)
  - **PER_ARTICLE**: 각 실제 조문에 적용 (N회)
- 최소 텍스트 길이(10줄) 미만 stub 제외

### [3] 매트릭스 생성 — `matrix_generator.py`

- N조문 × M기준 = N×M개 셀 생성
- 모든 셀 `verdict=None`으로 초기화
- document-level 기준: 1셀, per-article 기준: N셀

### [4] Stage 1: 관련성 필터 — `relevance_filter.py`

- **모델**: Haiku (응답 8토큰 이내)
- **프롬프트**: `pipeline/config/prompts/relevance.txt`
- 각 셀에 대해 해당 기준이 해당 조문에 관련 있는지 Yes/No 판단
- 조문 미리보기(500자) + 기준 제목으로 판단
- 관련 없는 셀은 Stage 2 건너뜀
- 100셀마다 체크포인트 저장

### [5] Stage 2: 정밀 심사 — `detailed_reviewer.py`

- **모델**: Sonnet (응답 1024토큰)
- **프롬프트**: `pipeline/config/prompts/review.txt`
- Stage 1에서 관련 있다고 판단된 셀만 대상
- 조문 전문 + 기준 전문(최대 15K자)을 LLM에 전달
- JSON 응답 파싱: `{verdict, reason, suggestion}`
- verdict 값: `적합` / `부적합` / `해당없음`
- 50셀마다 체크포인트 저장

### [6] 완전성 검증 — `result_aggregator.py`

- 빈 셀(verdict=None이면서 stage1_relevant≠False) 탐지
- 최대 3회 재시도
- 100% 완료 확인 후 보고서 단계로 진행

### [7] 보고서 생성 — `report_generator.py`

- **Markdown**: 요약 통계 + 부적합 목록 + 전체 매트릭스
- **JSON**: 기계 처리용 전체 결과

## 데이터 모델 (`models.py`)

| 모델 | 주요 필드 |
|------|-----------|
| `Article` | id, title, text, index |
| `Criterion` | id, title, scope, wiki_path, content |
| `ReviewCell` | article_id, criterion_id, stage1_relevant, verdict, reason, suggestion |
| `ReviewMatrix` | articles, criteria, cells (Dict) |

## CLI 사용법

```bash
# 기본 실행 (Stage 2만)
python -m pipeline.review.cli 조례안.txt

# 2단계 필터링 + 동시 실행 10개
python -m pipeline.review.cli 조례안.txt --two-stage --concurrency 10

# 중단된 실행 재개
python -m pipeline.review.cli 조례안.txt --resume checkpoint.json
```

### CLI 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `--output` | `review_report.md` | 보고서 출력 경로 |
| `--two-stage` | off | Stage 1 필터링 활성화 |
| `--concurrency` | 10 | 동시 LLM 호출 수 |
| `--model` | `claude-sonnet-4-20250514` | Stage 2 모델 |
| `--fast-model` | `claude-haiku-4-5-20251001` | Stage 1 모델 |
| `--resume` | — | 체크포인트 JSON 경로 |

## 주요 파일 맵

```
pipeline/
├── config/
│   ├── criteria_registry.json   # 심사 기준 레지스트리
│   └── prompts/
│       ├── relevance.txt        # Stage 1 프롬프트
│       └── review.txt           # Stage 2 프롬프트
└── review/
    ├── cli.py                   # CLI 진입점
    ├── models.py                # 데이터 모델
    ├── article_splitter.py      # [1] 조문 분리
    ├── criteria_loader.py       # [2] 기준 로딩
    ├── matrix_generator.py      # [3] 매트릭스 생성
    ├── relevance_filter.py      # [4] Stage 1 필터
    ├── detailed_reviewer.py     # [5] Stage 2 심사
    ├── result_aggregator.py     # [6] 완전성 검증
    ├── report_generator.py      # [7] 보고서 생성
    └── llm_client.py            # LLM API 클라이언트
```

## LLM 클라이언트 (`llm_client.py`)

- 비동기 Anthropic API 래퍼
- 세마포어 기반 동시성 제어 (기본 10)
- 지수 백오프 재시도 (최대 3회)
- Rate limit 및 API 에러 자동 복구
- 마크다운 코드블록 내 JSON 자동 추출
