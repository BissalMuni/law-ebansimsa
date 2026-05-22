# Law-Ebansimsa Implementation Plan

기술적 구현 계획(HOW). [constitution.md](constitution.md) 원칙과 [spec.md](spec.md) 요구사항을 만족하는 아키텍처·구조·순서를 정의한다.

> 토대: constitution §II 스택, [design/data-model.md](../design/data-model.md), [design/ui-spec.md](../design/ui-spec.md)

---

## 1. 아키텍처 개요

**모노레포** — `law-ebansimsa/` 한 곳에 `web/`(프론트)와 `api/`(백엔드)를 추가한다. 기존 `pipeline/`·`output/`(위키)는 그대로.

```text
[web/  Next.js 15 + Monaco + Prisma/SQLite]   ← UI + 데이터 영속 (DB 단독 소유)
        │  HTTP / SSE  (유일한 경계)
        ▼
[api/  FastAPI (무상태 compute)]               ← LLM·검증·검색·파싱·출력
        │  import
        ▼
[pipeline/]  review / draft / search / export ← 작업 엔진
        │
        ▼
[output/ 위키 마크다운]  +  [국가법령정보센터 OpenAPI]
```

**핵심 경계 규칙:**

- **DB는 `web/`의 Prisma가 단독 소유.** 모든 영속(Project/Stage/Section/Message/Validation/Reference/Snapshot CRUD)은 web에서. (data-model §1)
- **`api/`(FastAPI)는 무상태.** DB에 접근하지 않는다. 입력을 HTTP로 받아 계산 결과만 반환. → web과 api가 DB를 두고 엉키지 않음
- **위키는 파일.** `api/`가 `output/`의 마크다운을 읽어 시스템 프롬프트를 구성 (헌법 D1, 위키는 DB 밖)

---

## 2. 파일 구조

```text
law-ebansimsa/
├── web/                          # Next.js 15 (pnpm, vitest)
│   ├── src/
│   │   ├── app/                  # App Router (/, /new, /draft/[id])
│   │   ├── components/           # StageItem, ChatBubble, DiffBlock, CommandPalette...
│   │   ├── lib/
│   │   │   ├── api-client.ts     # api/ 호출 래퍼 (HTTP/SSE)
│   │   │   └── store/            # Zustand (패널·탭·단계 UI 상태)
│   │   └── server/               # Server Actions, TanStack Query 훅
│   ├── prisma/
│   │   ├── schema.prisma         # data-model §3 그대로
│   │   └── migrations/
│   └── package.json
│
├── api/                          # FastAPI (uv, pytest) — 무상태
│   ├── main.py                   # 엔드포인트 (§4)
│   ├── routers/                  # draft / validate / search / export / parse
│   ├── schemas.py                # Pydantic (Literal = data-model §4 허용값)
│   └── pyproject.toml
│
├── pipeline/                     # 기존 Python 엔진
│   ├── review/                   #  - Stage 7 매트릭스 검증 (현존)
│   ├── draft/                    #  - 단계별 LLM 오케스트레이션 (신규)
│   ├── search/                   #  - 국가법령정보센터 OpenAPI 래퍼 (신규)
│   └── export/                   #  - 마크다운 → DOCX/PDF (신규)
│
├── output/                       # 위키 (기존)
├── design/  .spec/               # 설계·명세 (기존)
└── .gitignore                    # node_modules/ + __pycache__/ .venv/ + *.db
```

---

## 3. 의존성

### web/ (pnpm)

| 패키지 | 용도 |
|--------|------|
| `next@15`, `react@19` | App Router, RSC |
| `tailwindcss@4`, `shadcn/ui` | 스타일·컴포넌트 |
| `@monaco-editor/react` | 에디터·DiffEditor |
| `@prisma/client`, `prisma` | DB (SQLite) |
| `zustand` | UI 상태 (패널·탭·단계) |
| `@tanstack/react-query` | 서버 상태 (api/ 응답) |
| `diff` (jsdiff) | 조 단위 정렬 보조 (Monaco diff 보완) |
| `vitest`, `@testing-library/react` | 테스트 |

### api/ (uv)

| 패키지 | 용도 |
|--------|------|
| `fastapi`, `uvicorn` | HTTP/SSE 서버 |
| `anthropic` | Claude 호출 (스트리밍) |
| `pydantic` | 스키마 (Literal 허용값) |
| `httpx` | 국가법령정보센터 OpenAPI |
| `python-docx`, `weasyprint`(또는 reportlab) | DOCX/PDF 출력 |
| `pytest` | 테스트 |

---

## 4. API 계약 (web ↔ api)

모두 무상태. web이 DB에서 필요한 데이터를 모아 보내고, 결과를 받아 Prisma로 저장한다.

| 메서드 | 경로 | 입력 | 출력 | pipeline | 헌법 |
|--------|------|------|------|----------|------|
| POST | `/draft/generate` (SSE) | 단계, 의도 프롬프트, 위키 근거 ref, 첨부 참고조례 | 조문 텍스트 스트림 + `citations` | `draft` | P1 |
| POST | `/validate/inline` | 조문 텍스트 1건 | 가벼운 힌트 (Haiku) | `review`(relevance) | P3 |
| POST | `/validate/precise` | 단계 조문들 + 기준 셀 | 매트릭스 결과 (1조문×1기준) | `review`(detailed) | P3, P6 |
| POST | `/validate/full` | 전체 조문 | 전체 매트릭스 (Stage 7) | `review --two-stage` | P3 |
| GET | `/search/ordinances` | 검색어·필터 | 타 지자체 조례 목록 | `search` | P4 |
| POST | `/parse/ordinance` | 기존 조례 원문 | 조 단위 파싱 결과 | `search`(parser) | — |
| POST | `/export` | 조례 md + 형식(docx/pdf) | 파일 바이트 | `export` | — |

- `/draft/generate`는 시스템 프롬프트에 위키 근거 + "참고 조례 복제 금지"(P4)를 주입
- `/validate/*`는 스크립트가 매트릭스를 강제 생성하고 셀 단위로 LLM 호출, 전 셀 충족 검증(P3)
- 근거 없는 내용은 응답에서 "기준에 없음" 표기(P1 강화)

---

## 5. 핵심 데이터 흐름

**작성**: 담당자 프롬프트 → web이 단계 위키 근거 + 첨부 ref 수집 → `POST /draft/generate` → 스트림을 Monaco에 표시 → 수용 시 web이 `OrdinanceSection`·`Message`(citations) 저장 + `Snapshot` 기록

**확정**: `⌘⏎` → web이 단계 조문 전송 → `POST /validate/precise` → 위반 시 ValidationDialog → 수용/직접수정/무시(사유 강제 P6) → 통과 시 `Stage.status=confirmed`, 다음 단계 unlock(P2)

**개정 로드**: 파일/검색/붙여넣기 → `POST /parse/ordinance` → 조 단위 `OrdinanceSection`(originalBody) 생성 → Monaco DiffEditor가 originalBody↔body 렌더, jsdiff로 조 정렬·변경 카운트

**출력**: Stage 8 → `POST /export` → DOCX/PDF 바이트 다운로드 (DB 저장 안 함, §7 참조)

---

## 6. 구현 순서 (Phase)

### Phase 1 — Setup

- 모노레포 골격(`web/` `api/`), `.gitignore` 정비
- `web/`: Next.js 15 + Tailwind 4 + shadcn 초기화, Prisma 스키마(data-model §3) 마이그레이션
- `api/`: FastAPI + uv 초기화, `/health`

### Phase 2 — Core (제정 흐름 MVP)

- 데이터 CRUD(Project/Stage/Section) + 단계 잠금 로직(P2)
- VS Code 레이아웃 6대 영역 셸 + StageItem
- `/draft/generate` SSE + Monaco 표시 + 근거 토글(P1)
- `/validate/precise` + ValidationDialog + 무시 사유(P6)

### Phase 3 — Features

- 본칙 동적 sub-stage(US5), 부유 액션·Command Palette(US10)
- 개정 모드: `/parse/ordinance` + DiffEditor + 변경 카운트(US6)
- 타 지자체 검색 `/search/ordinances`(US7, P4)
- 이력·시간여행 Snapshot(US8)
- Stage 7 전체 매트릭스 `/validate/full`

### Phase 4 — Polish

- `/export` DOCX/PDF(US9)
- 접근성 WCAG AA 점검(P5), 다크모드, 빈 상태·에러 카피
- 반응형 1366×768

---

## 7. 기술 결정 + 근거

| 결정 | 근거 |
|------|------|
| 모노레포(`web/`+`api/`) | 단일 개발자 v1엔 별도 repo 이점(독립 배포·권한) 미미. 폴더 경계로 충분 |
| FastAPI 무상태, DB는 web 단독 | web/api가 DB 스키마를 수동 동기화하는 결합 제거 |
| 출력물 DB 저장 안 함 (온디맨드 재생성) | 출력물은 `OrdinanceSection`에서 파생. blob은 SQLite 비대화. (D2와 동일 논리) |
| Snapshot v1 무제한 누적 | 단일 사용자·소량 데이터. 롤링 정책은 후순위 |
| Postgres 이전은 law-matcher 통합 시점 | v1 SQLite로 충분. `provider` 교체 경로 확보됨 |

---

## 8. Constitution 정합성 검증

- **P1** 근거 추적 → `/draft/generate` citations + 근거 토글, "기준에 없음" 표기 ✓
- **P2** 단계 잠금 → web의 잠금 로직 + `Stage.status` ✓
- **P3** 스크립트 매트릭스 강제 → `/validate/*`가 셀 단위 호출·전 셀 검증 ✓
- **P4** 복제 금지 → `/draft/generate` 시스템 프롬프트 주입 ✓
- **P5** WCAG AA → Phase 4 점검 ✓
- **P6** 무시 사유 강제 → ValidationDialog + `dismissedReason` ✓

---

## 9. 잔여 미해결 (구현 중 확정)

- 국가법령정보센터 OpenAPI 실제 응답 스키마 → `/parse`·`/search` 구현 시 검증 (개정 모드 PoC, spec #3 연계)
- DOCX/PDF 라이브러리 최종 선택(weasyprint vs reportlab) → Phase 4 진입 시 결정
- `web/`↔`api/` 인증(로컬 단일 사용자라 v1은 무인증, 향후 토큰)

---

## 변경 이력

| 버전 | 날짜 | 변경 |
|------|------|------|
| 1.0.0 | 2026-05-22 | 세션 2 — 구현 계획 확정. 모노레포(web/+api/), FastAPI 무상태, DB는 web/Prisma 단독, 출력물 온디맨드 재생성. API 계약 7종, 4-Phase 구현 순서 |
