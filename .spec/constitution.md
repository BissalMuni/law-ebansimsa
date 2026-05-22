# Law-Ebansimsa Constitution

조례 입안 협업 IDE의 변하지 않는 원칙. 모든 spec·plan·구현은 이 헌법을 위반할 수 없다.

> 토대: [design/ui-spec.md](../design/ui-spec.md) v0.3.0, [design/review-notes.md](../design/review-notes.md) §2.9, [design/data-model.md](../design/data-model.md) v1.0.0

---

## I. NON-NEGOTIABLE 원칙

이 원칙들은 협상 불가다. 위반하는 구현은 거부한다.

### P1. 모든 AI 작성 문장은 위키 출처를 토글로 확인할 수 있어야 한다
AI가 생성한 조례 문장은 어느 입안·정비 기준(위키 섹션)을 근거로 했는지 항상 추적 가능해야 한다. 근거 없는 생성은 허용하지 않는다. (`Message.citations`)

### P2. 단계 잠금은 우회 불가하다
표준 8단계(meta→purpose→definition→scope→main→supplementary→review→finalize)는 선형 잠금된다. 이전 단계가 `confirmed`가 아니면 다음 단계로 진입할 수 없다. 확정된 단계 수정 시 이후 단계는 `stale` 마크된다.

### P3. 심사는 스크립트가 강제하고 LLM은 1회 1판단만 한다
조례 검증 시 스크립트가 매트릭스(조문 × 기준)를 생성하고, LLM은 1회에 1조문 × 1기준만 판단한다. 문서 통째 입력 금지. 결과 매트릭스가 전부 채워졌는지 스크립트로 검증한다. (누락은 법률 심사에서 치명적)

### P4. 타 지자체 조례는 참고만 가능하며 복제는 금지한다
참고 조례를 AI 컨텍스트에 첨부할 때 "참고하되 그대로 복사하지 말 것"을 시스템 프롬프트에 명시한다.

### P5. WCAG 2.1 AA를 만족한다
색·기호·텍스트 3중 인코딩, 키보드 전체 접근, 4.5:1 대비, 스크린리더 대응.

### P6. 검증 무시는 사유 기록을 강제한다
"이유 있는 예외"로 검증 위반을 무시할 때 사유 입력을 강제하고 이력에 남긴다. (`ValidationResult.dismissedReason`)

---

## II. 기술 스택 (review-notes §2.9 확정)

| 영역 | 결정 |
|------|------|
| 프론트엔드 | Next.js 15 (App Router) + Tailwind 4 + shadcn/ui |
| 에디터 | Monaco (DiffEditor 내장) |
| 상태 관리 | Zustand (UI) + TanStack Query (서버 상태) |
| 백엔드 | 별도 FastAPI 서비스 (기존 Python `pipeline/` 재사용) |
| LLM | Python `anthropic` SDK + SSE 스트리밍 |
| DB | SQLite + Prisma (Postgres 마이그레이션 경로 확보) |
| Diff | Monaco DiffEditor(렌더) + jsdiff(조 단위 정렬) |
| 데이터 소스 | 위키(마크다운), 국가법령정보센터 OpenAPI |

**제약**: 위키는 DB에 넣지 않는다(마크다운이 진실원). DiffHunk는 파생, 영속화하지 않는다.

---

## III. 코딩 컨벤션

- 사용자 응답: 영어
- 커밋 메시지: 영어
- 코드 주석: 한국어
- 프론트 패키지 매니저: **pnpm**, 테스트: **vitest**
- 백엔드: **uv**, 테스트: **pytest**
- String enum: SQLite 제약상 String + 허용값 사전(data-model §4) / FastAPI Pydantic `Literal` 매칭

---

## IV. 비기능 요구사항

- **톤**: 정부·공공 (안정·신뢰). 정부 네이비 `#1B3D7A`, 그림자 최소화
- **테마**: 라이트 / 다크
- **언어**: 한국어 단일 (v1), i18n 가능성 열어둠
- **범위**: 단일 사용자·단일 프로젝트 (v1). 다중 사용자·권한은 비-목표
- **반응형**: 1366×768(공공기관 표준) 지원, 768px 미만 비지원

---

## V. 거버넌스

- 이 헌법과 충돌하는 spec/plan은 헌법이 우선한다
- 헌법 변경은 명시적 결정과 근거 기록을 동반한다 (review-notes에 세션 기록)

---

## 변경 이력

| 버전 | 날짜 | 변경 |
|------|------|------|
| 1.0.0 | 2026-05-22 | 세션 2 — 헌법 초안. 6 NON-NEGOTIABLE 원칙, 확정 스택, 컨벤션, 비기능 요구사항 |
