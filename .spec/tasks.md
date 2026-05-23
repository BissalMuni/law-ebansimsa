# Law-Ebansimsa Tasks

[plan.md](plan.md) v1.0.0를 실행 가능한 작업으로 분해. Phase 순서대로 진행하며, 각 작업은 독립 검증 가능하다. `[P]` = 같은 Phase 내 병렬 가능.

> 형식: `- [ ] [Txxx] 작업 (파일 경로)` · 완료 시 `- [x]`

---

## Phase 1 — Setup

- [x] [T001] 모노레포 `.gitignore` 정비 — `node_modules/`, `__pycache__/`, `.venv/`, `*.db` (`.gitignore`)
- [x] [T002] `web/` Next.js 15 초기화 — TypeScript·Tailwind 4·App Router·src-dir, pnpm (`web/`)
- [x] [T003] [P] `web/` shadcn/ui 초기화 + 기본 컴포넌트 (`web/src/components/ui/`)
- [x] [T004] [P] `web/` 디자인 토큰 적용 — 정부 네이비, 라이트/다크 (`web/src/app/globals.css`)
- [x] [T005] `web/` Prisma 설정 + `schema.prisma` (data-model §3 그대로) (`web/prisma/schema.prisma`)
- [x] [T006] `web/` 첫 마이그레이션 + Prisma Client 생성 (`web/prisma/migrations/`)
- [x] [T007] [P] `web/` Zustand + TanStack Query 프로바이더 (`web/src/lib/store/`, `web/src/app/providers.tsx`)
- [x] [T008] `api/` FastAPI + uv 초기화 (`api/pyproject.toml`, `api/main.py`)
- [x] [T009] [P] `api/` Pydantic 스키마 — Literal = data-model §4 허용값 (`api/schemas.py`)
- [x] [T010] `api/` `/health` + `web/` api-client(HTTP/SSE) 연결 (`api/main.py`, `web/src/lib/api-client.ts`)

## Phase 2 — Core (제정 흐름 MVP)

- [x] [T011] Project CRUD — Server Actions + Prisma (`web/src/server/projects.ts`)
- [x] [T012] `/new` 작업 종류 선택 화면(제정/일부개정/전부개정) (`web/src/app/new/page.tsx`)
- [x] [T013] `/draft/[id]` 워크스페이스 셸 — VS Code 6대 영역 레이아웃 (`web/src/app/draft/[id]/page.tsx`)
- [x] [T014] StageItem + 단계 사이드바 + 표준 8단계 시드 (`web/src/components/StageItem.tsx`, `web/src/server/stages.ts`)
- [x] [T015] 단계 잠금 로직 — locked→…→confirmed, 우회 불가 + 확정 단계 수정 시 이후 단계 `stale` 마킹 (P2, FR-004) (`web/src/server/stages.ts`)
- [x] [T016] `api` `/draft/generate` SSE — pipeline/draft, 위키 근거 주입, 복제 금지(P4) (`api/routers/draft.py`, `pipeline/draft/`)
- [x] [T017] Monaco 에디터 통합 + 조문 표시 + 멀티탭·split 뷰 (FR-014) (`web/src/components/Editor.tsx`)
- [x] [T018] AI 채팅 패널(Secondary Sidebar) + 근거 토글 (P1) (`web/src/components/ChatPanel.tsx`)
- [ ] [T019] 조문 저장 — OrdinanceSection + Message(citations) + Snapshot + 500ms idle 자동저장 (ui-spec §7.6) (`web/src/server/sections.ts`)
- [x] [T020] `api` `/validate/precise` — pipeline/review detailed, 1조문×1기준 강제 (P3) (`api/routers/validate.py`)
- [ ] [T021] ValidationDialog + 무시 사유 강제 (P6) (`web/src/components/ValidationDialog.tsx`)
- [ ] [T022] 단계 확정 흐름 — 검증 통과 시 다음 단계 unlock (`web/src/server/stages.ts`)

## Phase 3 — Features

- [ ] [T023] 본칙 동적 sub-stage 모달 + sub-stage 생성 (US5) (`web/src/components/MainStageModal.tsx`)
- [ ] [T024] [P] Command Palette (⌘P/⌘⇧P) (US10) (`web/src/components/CommandPalette.tsx`)
- [ ] [T025] [P] 부유 액션 툴바(텍스트 선택 시) (`web/src/components/FloatingToolbar.tsx`)
- [x] [T026] `api` `/parse/ordinance` — 조 단위 파싱 (`api/routers/parse.py`, `pipeline/search/`)
- [ ] [T027] 개정 모드 기존 조례 로드 모달(업로드/검색/붙여넣기) (US6) (`web/src/components/LoadOrdinanceModal.tsx`)
- [ ] [T028] Monaco DiffEditor + 조 단위 정렬(jsdiff) + 변경 카운트 (`web/src/components/DiffView.tsx`)
- [x] [T029] `api` `/search/ordinances` — 국가법령정보센터 OpenAPI (P4) (`api/routers/search.py`, `pipeline/search/`)
- [ ] [T030] 타 지자체 검색 모달 + AI 컨텍스트 첨부 (US7) (`web/src/components/ReferenceSearch.tsx`)
- [x] [T031] `api` `/validate/inline` — Haiku 힌트 (`api/routers/validate.py`)
- [ ] [T032] 인라인 힌트 표시(문제 패널) (`web/src/components/ProblemsPanel.tsx`)
- [ ] [T033] 이력·시간여행 — Snapshot 타임라인 (US8) (`web/src/components/HistoryView.tsx`)
- [ ] [T034] `api` `/validate/full` + 검토 매트릭스 탭 (Stage 7) (`api/routers/validate.py`, `web/src/components/ReviewMatrix.tsx`)

## Phase 4 — Polish

- [x] [T035] `api` `/export` DOCX/PDF — pipeline/export, 온디맨드(blob 없음) (US9) (`api/routers/export.py`, `pipeline/export/`)
- [ ] [T036] 최종안 출력(Stage 8) + 다운로드 (`web/src/components/ExportPanel.tsx`)
- [ ] [T037] [P] 접근성 WCAG AA 점검 — 3중 인코딩·키보드·aria (P5) (`web/`)
- [ ] [T038] [P] 다크모드 + 빈 상태·에러 카피 (`web/`)
- [ ] [T039] [P] 반응형 1366×768 (`web/`)
- [ ] [T040] 통합 테스트(vitest/pytest) + spec SC-001~006 검증 (`web/`, `api/`)

---

## 의존성 메모

- Phase 1 → 2 → 3 → 4 순서 (Phase 간 선행 필수)
- Phase 2: T011→T012→T013→T014→T015 순차, T016~T022는 셸(T013) 이후
- Phase 3: 개정 모드 T026→T027→T028 순차, 검색 T029→T030 순차, 나머지 병렬 가능
- `[P]` 작업은 같은 Phase 내 동시 진행 가능

## 요약

| Phase | 작업 수 | 핵심 산출 |
|-------|--------|----------|
| 1 Setup | 10 (T001~T010) | 모노레포·Prisma·FastAPI 골격 |
| 2 Core | 12 (T011~T022) | 제정 흐름 MVP (작성·검증·잠금) |
| 3 Features | 12 (T023~T034) | 개정·검색·본칙·이력·전체검토 |
| 4 Polish | 6 (T035~T040) | 출력·접근성·반응형·테스트 |
| **합계** | **40** | |

> Phase 2 완료 시점에 **제정 1건을 8단계 완주(SC-001)** 가능한 MVP 도달.
