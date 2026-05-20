---
title: UI 디자인 검토 노트
date: 2026-05-20
session: 1
status: living document
---

# UI 디자인 검토 노트

[ui-spec.md](ui-spec.md)가 "무엇을 만들 것인가"라면, 이 문서는 "왜 그렇게 결정했는가"와 "아직 정해지지 않은 것"의 기록이다. 의사결정 추적과 다음 세션 컨텍스트 복원을 목적으로 한다.

---

## 1. 세션 1 (2026-05-20) — 제품 방향 정의

### 1.1 시작점

- 프로젝트는 `law-ebansimsa` = "조례 입안 심사" 자동화 시스템
- 기존 자산: 위키 지식베이스(`output/ebansimsa/wiki/`, `output/jungbigijun/wiki/`), 파이프라인(`pipeline/review/`), PDF 원본 2건
- 목표: 프론트엔드 UI를 처음 기획·디자인

### 1.2 사용자 선택 (전체)

| 질문 | 선택 | 영향 |
|------|------|------|
| 어떤 제품? | 통합 대시보드 (위키 + 심사) | 처음엔 검토 도구로 시작 |
| 산출물 형태 | Figma 스타일 상세 스펙 | 픽셀이 아닌 텍스트 스펙 우선 |
| 타겟 사용자 | 지자체 법무 담당자 | 정부·공공 톤 |
| 디자인 톤 | 정부·공공 (안정·신뢰) | 네이비 기반, 그림자 최소화 |
| 접근성 | WCAG AA + 다크모드 + 한국어 단일 | 4.5:1 대비, 3중 인코딩 |
| 카테고리 구성 | 표준 조례 구조 고정 (8단계) | meta·purpose·definition·scope·main·supplementary·review·finalize |
| 단계 이동 방식 | 추천(=선형 잠금 + 자유 회귀) | 다음 단계는 확정 후 열림, 이전 단계는 언제든 수정 가능 |
| 검증 시점 | 인라인 + 단계 확정 시 정밀 | Haiku 소프트 힌트 + Sonnet 정밀 매트릭스 |
| 동시 프로젝트 | 한 번에 하나 | 단일 프로젝트 중심 UI, 다중 처리 X |

### 1.3 핵심 발견 — 사용자가 짚어준 통찰

세션 중 사용자 입력으로 발생한 큰 방향 전환 두 차례:

#### 전환 ① v0.1.0 → v0.2.0 (검토 도구 → 입안 도구)

> **사용자 발언**: "지금 이 프로젝트가 이반심사라고 되어 있지만 [...] 입안을 세우는 것부터 입안심사 문서와 정비 기준 문서에 따라서 담당자가 프롬프트를 입력하면 [...] AI가 [...] 내용을 순차적으로 작성해 주는 거야"

- **잘못 잡고 있던 가정**: 프로젝트 이름이 "심사"라서 완성된 조례안을 검토(review)하는 도구라고 추정
- **실제 의도**: 조례를 입안(draft)하는 단계부터 AI와 협업하는 도구. 검토는 입안 흐름 중 일부에만 등장
- **교훈**: 프로젝트 이름이 아니라 사용자 워크플로를 먼저 확인했어야 함. 도구 카테고리(검토 vs 입안)는 UI 구조 거의 전체를 바꾸므로 첫 질문에 반드시 포함

#### 전환 ② v0.2.0 → v0.3.0 (단순 워크스페이스 → VS Code 메타포 + 제정/개정 분기)

> **사용자 발언**: "조례를 위반한다는 것은 개정이 있고 그리고 제정이 있고 그리고 전부개정이 있어 [...] 드래프트 초안을 보여주는 화면이 있어야 되고 [...] 그러고 보니 생각해 보니 이게 지금 현재 VS 코드 이 화면과 비슷하게 되겠네"

두 통찰이 동시에 들어옴:
1. **작업 종류 분기**: 제정 / 일부개정 / 전부개정 — 개정은 기존 조례를 로드해야 함. v0.2.0은 모두 백지에서 시작한다고 가정했었음
2. **VS Code 메타포**: 다중 패널·탭·split·Command Palette — 법무 담당자가 동시에 참조하는 문서 수(원본·개정안·위키·타 지자체)가 많다는 점을 자연스럽게 수용

- **교훈**: 사용자가 "이 화면 ~과 비슷하다"라는 메타포를 던지면 즉시 채택할 가치가 있는지 평가. VS Code 메타포는 (1) 법무 담당자 다수가 익숙한 도구는 아니지만 (2) 다중 참조 워크플로에 구조적으로 잘 맞고 (3) Diff·탭·Palette 컨벤션을 그대로 가져올 수 있어 디자인 부담 감소

---

## 2. 확정된 결정

### 2.1 제품 정체성

- **한 줄**: 담당자는 조례 카테고리별 의도만 던지면, AI가 표준 구조와 입안·정비 기준에 맞게 조례 문장을 단계적으로 써 내려가는 도구
- **AI는 작성자, 담당자는 디렉터** — 문장 생성은 AI, 의도·방향·수정 지시는 담당자
- **검토(verdict 매트릭스)는 입안 흐름의 일부** — Stage 7에서 자동 검증으로만 등장. 메인이 아님

### 2.2 표준 조례 구조 8단계

위키 `output/ebansimsa/wiki/` 제2편 세부 입안기준을 그대로 단계화:

1. `meta` — 제명·제정/개정 사유 (§3.1.2)
2. `purpose` — 목적 규정 (§2.1.2)
3. `definition` — 정의 규정 (§2.1.4)
4. `scope` — 적용 범위·책무 (§2.1.6~8)
5. `main` — 본칙 (동적, §2.2.x 11종 중 선택)
6. `supplementary` — 부칙 (§2.3.x 7종, 시행일 항상 포함)
7. `review` — 전체 검토 매트릭스 (§4.1)
8. `finalize` — 최종 출력 (§3.1.6)

### 2.3 작업 종류 3-way 분기

| Kind | 시작 상태 | UI |
|------|----------|-----|
| 제정 (enact) | 백지 | 빈 골격 |
| 일부개정 (amend_partial) | 기존 조례 로드 | 좌(원본) ↔ 우(개정안) split, **Diff 기본** |
| 전부개정 (amend_full) | 기존 조례 로드(참고) | 원본 탭 + 신규 작성 탭, Diff 선택적 |

### 2.4 VS Code 메타포 6대 영역

- **Activity Bar** (48px) — 단계 / 위키 / 검색 / 이력 / 타 지자체 / 문제 / 설정
- **Primary Sidebar** (240px) — Activity Bar 선택에 따라 뷰 전환
- **Editor Area** (중앙) — 멀티탭, split, diff. 탭 종류: 개정안.md, 원본.md, Diff, 위키, 참고조례, 검토매트릭스
- **Secondary Sidebar** (380px) — AI 채팅 패널
- **Bottom Panel** — 문제·이력·출력·터미널
- **Status Bar** (24px) — 프로젝트·kind·진행률·현재 단계·모델

### 2.5 명령 시스템 3중 모델

1. **Command Palette** (`⌘P`/`⌘⇧P`) — fuzzy match, 단축키 우측 표시
2. **부유 액션 툴바** — 텍스트 선택 시 등장 (다른 톤 / 짧게 / 길게 / 근거 / AI에게)
3. **우클릭 컨텍스트 메뉴** — 조 헤더 / 탭 / 사이드바 항목 / Diff 블록별로 다른 메뉴

### 2.6 단계 잠금 + 자유 회귀

- 다음 단계는 현재 단계 `confirmed` 후 열림
- 확정된 단계는 언제든 수정 가능 → 이후 단계는 `stale` 마크 (재확정 시 해제)
- 비가역 작업(삭제·중단·재실행)은 2단계 확인

### 2.7 디자인 토큰

- 1차 색: 정부 네이비 `#1B3D7A` (라이트) / `#6A9BFF` (다크)
- verdict 4종: pass / fail / na / pending — 색 + 아이콘 + 텍스트 3중 인코딩
- 단계 상태 6종: locked / available / in_progress / validating / confirmed / stale / failed
- 본문: Pretendard Variable, 조문·숫자: JetBrains Mono
- 그림자 최소화 (정부 톤), 4px 베이스 스페이싱

### 2.8 데이터 소스

- 입안·정비 기준 → 위키 (`output/{ebansimsa,jungbigijun}/wiki/`)
- 타 지자체 조례 검색 → 국가법령정보센터 OpenAPI (정부 공식)
- 검증 파이프라인 → `pipeline/review/` (현존, 단계 확정 시 재사용)

---

## 3. 미해결 결정 사항

다음 세션에서 결정해야 할 항목들:

### 3.1 기술 스택

| 항목 | 후보 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 15 (App Router) 권장 | RSC + Server Actions 활용 가능 |
| 스타일 | Tailwind 4 + shadcn/ui | CLAUDE.md의 pnpm + vitest와 정합 |
| **에디터 엔진** | **Monaco vs CodeMirror 6** | VS Code 메타포 → Monaco 자연스러움. 단 한국어 IME 안정성·번들 크기 검토 필요 |
| LLM 클라이언트 | Anthropic SDK + 스트리밍 | 단계 채팅·인라인 힌트 둘 다 사용 |
| 상태 관리 | Zustand 또는 Server State (TanStack Query) | 단일 프로젝트라 무겁지 않게 |
| Diff 엔진 | `diff-match-patch` 또는 `jsdiff` | 조 단위 정렬 로직은 자체 구현 |

### 3.2 데이터 모델

스키마 정의 필요:

- `Project { id, kind: enact|amend_partial|amend_full, title, municipality, createdAt, lockedAt }`
- `Stage { project_id, name, status, confirmedAt, staleReason }`
- `OrdinanceSection { stage_id, article_no, title, body, originalBody (개정 시) }`
- `Message { stage_id, role: user|ai|system, content, attachments, createdAt }`
- `DiffHunk { section_id, type: add|modify|delete, ... }`
- `ValidationResult { section_id, criterion_id, verdict, reason, suggestion, dismissedReason }`
- `Reference { project_id, source: file|opendata|paste, content, includedInContext }`

저장소: SQLite(로컬 우선) vs Supabase(클라우드)? 단일 사용자라면 SQLite 충분.

### 3.3 백엔드 모듈 분리

현재 `pipeline/review/`를 다음 3개로 확장:

- `pipeline/review/` — Stage 7 매트릭스 검증 (현존)
- `pipeline/draft/` — 단계별 LLM 호출 오케스트레이션 (신규)
- `pipeline/search/` — 국가법령정보센터 OpenAPI 래퍼 (신규)
- `pipeline/export/` — 마크다운 → HWP/DOCX/PDF 변환 (신규)

각 모듈 책임 경계 명확화 필요.

### 3.4 개정 모드 PoC 검증 필요

다음을 실제로 가능한지 PoC로 검증해야 함:

1. 국가법령정보센터 API로 특정 지자체 특정 조례 본문 로드
2. 본문에서 조 단위 파싱 (제1조·제2조 정규식 안정성)
3. diff-match-patch로 조 단위 diff 계산 + 시각화
4. HWP 출력 형식 — 정부 표준이지만 라이브러리 한정적. hwpx(XML) 라이브러리 후보 조사 필요

### 3.5 다중 사용자·권한

- v1은 단일 사용자 가정 (CLAUDE.md 메모리에 명시)
- 향후 부서 협업 시 권한·승인 흐름 어떻게 할지 미정

### 3.6 i18n·접근성

- v1 한국어 단일이지만, 컴포넌트 라이브러리 선택 시 i18n 가능성 열어둘 것
- 스크린리더 테스트는 어떻게 할지 미정 (NVDA 한국어 대응 등)

---

## 4. /init-docker-dangerous 게이트 결과

세션 막바지에 `/init-docker-dangerous` 시도 → spec-kit 설계 문서 부재로 GATE 차단됨.

| 파일 | 상태 |
|------|------|
| `.specify/memory/constitution.md` | ❌ 없음 |
| `specs/*/spec.md` | ❌ 없음 |
| `specs/*/plan.md` | ❌ 없음 |
| `specs/*/tasks.md` | ❌ 없음 |

### 다음 세션 진입 절차

1. **`/speckit.constitution`** — 헌법 작성
   - 후보 NON-NEGOTIABLE 원칙:
     - "모든 AI 작성 문장은 위키 출처 토글 가능해야 한다"
     - "단계 잠금은 우회 불가하다"
     - "WCAG AA를 만족해야 한다"
     - "타 지자체 조례는 참고만 가능하며 그대로 복제 금지를 AI 프롬프트에 명시한다"
2. **`/speckit.specify`** — 기능 명세
   - 토대: [ui-spec.md](ui-spec.md) v0.3.0 통째로 활용
   - 유저 스토리 형식으로 재구성 필요
3. **`/speckit.plan`** — 구현 계획
   - 위 §3 미해결 결정 사항 일부를 plan 단계에서 확정
4. (선택) **`/speckit.tasks`** — 태스크 분해
5. `/init-docker-dangerous` 재진입 → Phase 1 환경 설정 → Phase 2 구현

---

## 5. 산출물 목록

이 세션 결과로 추가된 자산:

| 파일 | 역할 |
|------|------|
| [design/ui-spec.md](ui-spec.md) | v0.3.0 디자인 스펙 (메인 산출물, 770줄) |
| [design/review-notes.md](review-notes.md) | 의사결정·검토 이력 (이 문서) |
| `.gitignore` (수정) | `output/**/*_images/` 패턴 보강하여 중첩 PDF 이미지 제외 |

커밋: `57000e6` Add UI design spec for drafting workspace with VS Code metaphor

---

## 6. 변경 이력

| 날짜 | 변경 |
|------|------|
| 2026-05-20 | 세션 1 검토 노트 초안 작성 (제품 방향 v0.1→v0.3 진화, VS Code 메타포 도입 결정, speckit GATE 게이트 차단 기록) |
