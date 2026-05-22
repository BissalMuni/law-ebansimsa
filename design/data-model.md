---
title: Law-Ebansimsa 데이터 모델
version: 1.0.0
status: confirmed
date: 2026-05-22
session: 2
stack: SQLite + Prisma (Postgres 마이그레이션 가능)
---

# Law-Ebansimsa — 데이터 모델

[ui-spec.md](ui-spec.md) v0.3.0과 [review-notes.md](review-notes.md) §2.9 확정 스택을 토대로 한 영속 데이터 스키마. Prisma를 단일 진실원으로 두고, FastAPI 백엔드(§2.9)는 이 스키마가 생성한 DB를 공유한다.

---

## 1. 설계 원칙

| # | 원칙 | 적용 |
|---|------|------|
| D1 | **위키는 DB에 넣지 않는다** | 입안·정비 기준 위키는 마크다운 파일이 진실원(CLAUDE.md 아키텍처). 검증은 `criterionId` 문자열(예: `3.3.1`)로만 참조 |
| D2 | **Diff는 파생, 저장 안 함** | `originalBody` vs `body`에서 jsdiff로 실시간 계산. 별도 `DiffHunk` 테이블 없음. 조별 `changeType` 캐시만 유지 |
| D3 | **enum은 String** | SQLite는 native enum 미지원 → `String` + 주석으로 허용값 고정. Postgres 이전 시 enum 승격 가능 |
| D4 | **Cascade 삭제** | Project 삭제 시 하위 전부 삭제. 단, 프로젝트 잠금(`status=locked`)은 UI에서 이중 확인 |
| D5 | **대화 로그 ≠ 문서 스냅샷** | `Message`는 채팅 턴, `Snapshot`은 시간여행용 본문 상태. 둘 다 필요(§8.3, §7.6) |
| D6 | **JSON은 Prisma Json** | citations·attachments 등 가변 배열은 `Json`. SQLite/Postgres 양쪽 지원 |

---

## 2. 엔티티 관계 (ERD)

```
Project ──1:N── Stage ──self── Stage(substage, 본칙 동적)
   │              ├──1:N── Message ──(citations·attachments)
   │              ├──1:N── Snapshot
   │              └──1:N── OrdinanceSection
   ├──1:N── OrdinanceSection ──1:N── ValidationResult
   └──1:N── Reference
```

- `Stage`는 자기참조로 본칙(`main`) sub-stage 표현
- `OrdinanceSection`은 Project(전체 조례)와 Stage(생성·소유 단계, 거터 배지) 양쪽에 연결
- `ValidationResult`는 조 단위, 위키 기준은 문자열 참조(D1)

---

## 3. Prisma 스키마

```prisma
// 패키지 매니저 pnpm. SQLite native enum 미지원 → String + 주석으로 허용값 고정 (D3)
// provider만 postgresql로 교체하면 클라우드 이전 가능 (review-notes §2.9)

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 입안 프로젝트 — 한 번에 하나 (단일 프로젝트 중심 UI)
model Project {
  id           String    @id @default(cuid())
  kind         String    // enact | amend_partial | amend_full
  title        String    // 제명 (예: 청년 창업 지원 조례)
  municipality String    // 지자체명
  status       String    @default("active") // active | locked
  progress     Int       @default(0)         // 0-100, 파생 캐시
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  lockedAt     DateTime?

  stages     Stage[]
  sections   OrdinanceSection[]
  references Reference[]

  @@index([status])
}

// 표준 8단계 + 본칙 동적 sub-stage (self-relation)
model Stage {
  id          String    @id @default(cuid())
  projectId   String
  key         String    // meta|purpose|definition|scope|main|supplementary|review|finalize
  label       String    // 표시명 (예: 정의 규정)
  order       Int       // 정렬 순서
  required    Boolean   @default(true)
  status      String    @default("locked")
  // locked|available|in_progress|validating|confirmed|stale|failed
  staleReason String?   // 이전 단계 수정으로 영향받았을 때 사유 (§5.3)
  wikiRef     String?   // 근거 위키 섹션 (예: 2.1.4)
  confirmedAt DateTime?

  // 본칙(main) 동적 sub-stage: 위원회·보조·출연 등 (§4.1)
  parentId  String?
  parent    Stage?  @relation("StageSubstages", fields: [parentId], references: [id])
  substages Stage[] @relation("StageSubstages")

  project   Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sections  OrdinanceSection[]
  messages  Message[]
  snapshots Snapshot[]

  @@unique([projectId, key, parentId])
  @@index([projectId, order])
}

// 조(條) 단위 본문. 개정 모드는 originalBody 보유
model OrdinanceSection {
  id           String  @id @default(cuid())
  projectId    String
  stageId      String  // 이 조를 생성·소유한 단계 (에디터 거터 배지)
  articleNo    Int     // 조 번호 (제N조)
  articleLabel String? // 표기형 (예: "제2조(정의)")
  title        String  // 조 제목 (정의·목적 등)
  body         String  // 현재 본문 (개정안 버퍼)
  originalBody String? // 개정 모드: 로드된 원본 (읽기 전용)
  changeType   String? // 개정 파생 캐시: unchanged|add|modify|delete (D2)
  order        Int     // 조 정렬

  project     Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  stage       Stage              @relation(fields: [stageId], references: [id], onDelete: Cascade)
  validations ValidationResult[]

  @@index([projectId, order])
}

// 단계별 채팅 로그 (담당자 ↔ AI)
model Message {
  id          String   @id @default(cuid())
  stageId     String
  role        String   // user | ai | system
  content     String
  citations   Json?    // AI 근거 위키 섹션 배열 (예: ["2.1.4","3.3.1"]) — P1 근거 우선
  attachments Json?    // 첨부 컨텍스트 (위키 페이지·Reference id 배열)
  applied     Boolean  @default(false) // "Editor에 적용" 클릭 여부
  createdAt   DateTime @default(now())

  stage Stage @relation(fields: [stageId], references: [id], onDelete: Cascade)

  @@index([stageId, createdAt])
}

// 검증 결과 — 인라인 힌트(Haiku) + 정밀 검증(Sonnet 매트릭스) 통합 (§8.2)
model ValidationResult {
  id              String   @id @default(cuid())
  sectionId       String
  criterionId     String   // 위키 기준 식별자 (예: 3.3.1) — DB에 위키 없음(D1)
  source          String   // ebansimsa | jungbigijun (어느 기준서)
  verdict         String   // pass | fail | na | pending
  severity        String?  // hint | violation (인라인 vs 정밀)
  reason          String?
  suggestion      String?  // AI 자동 수정 제안
  dismissedReason String?  // "이유 있는 예외"로 무시 시 사유 (필수 기록, §5.2)
  createdAt       DateTime @default(now())

  section OrdinanceSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  @@index([sectionId, verdict])
}

// 타 지자체 참고 조례 (§8.1)
model Reference {
  id                String   @id @default(cuid())
  projectId         String
  source            String   // file | opendata | paste
  title             String   // 조례 제목
  municipality      String?
  content           String   // 조례 전문
  sourceUrl         String?  // opendata 출처 URL
  includedInContext Boolean  @default(false) // AI 컨텍스트 포함 토글
  createdAt         DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}

// 시간여행용 본문 스냅샷 — 채팅 로그와 별개 (D5, §7.6)
model Snapshot {
  id        String   @id @default(cuid())
  stageId   String
  trigger   String   // confirm | ai_apply | manual_save
  actor     String   // user | ai
  label     String?  // 표시용 (예: "확정 → 검증 통과")
  content   Json     // 그 시점 조 단위 본문 스냅샷
  createdAt DateTime @default(now())

  stage Stage @relation(fields: [stageId], references: [id], onDelete: Cascade)

  @@index([stageId, createdAt])
}
```

---

## 4. 허용값 사전 (String enum)

D3에 따라 String으로 저장하되 아래 값만 허용. FastAPI 측 Pydantic `Literal`과 1:1 매칭.

| 필드 | 허용값 |
|------|--------|
| `Project.kind` | `enact`, `amend_partial`, `amend_full` |
| `Project.status` | `active`, `locked` |
| `Stage.key` | `title`, `purpose`, `definition`, `scope`, `main`, `supplementary`, `review`, `finalize` (한글명·근거 §4.1) |
| `Stage.status` | `locked`, `available`, `in_progress`, `validating`, `confirmed`, `stale`, `failed` |
| `OrdinanceSection.changeType` | `unchanged`, `add`, `modify`, `delete` |
| `Message.role` | `user`, `ai`, `system` |
| `ValidationResult.verdict` | `pass`, `fail`, `na`, `pending` |
| `ValidationResult.source` | `ebansimsa`, `jungbigijun` |
| `ValidationResult.severity` | `hint`, `violation` |
| `Reference.source` | `file`, `opendata`, `paste` |
| `Snapshot.trigger` | `confirm`, `ai_apply`, `manual_save` |
| `Snapshot.actor` | `user`, `ai` |

### 4.1 표준 8단계 키 ↔ 한글명 (단일 출처)

`Stage.key`의 정식 영문 키와 한글 단계명 대응. 헌법 P2·spec은 이 표를 참조한다. 정비기준상 자치법규 구조는 **제명 → 총칙(목적·정의·적용범위) → 본칙 → 부칙** 순이며, 검토·완성은 작성 후 처리 단계다.

| 순서 | `Stage.key` | 한글 단계명 | 정비기준 대응 |
|------|-------------|------------|---------------|
| 1 | `title` | 제명 | 제명(조례 제목) |
| 2 | `purpose` | 목적 | 목적규정 (총칙) |
| 3 | `definition` | 정의 | 정의규정 (총칙) |
| 4 | `scope` | 적용범위 | 적용 범위규정 (총칙) |
| 5 | `main` | 본칙 | 본칙규정(실체·보칙) |
| 6 | `supplementary` | 부칙 | 부칙규정 |
| 7 | `review` | 검토 | (작성 후 심사 단계) |
| 8 | `finalize` | 완성 | (산출·내보내기 단계) |

> 2~4단계(목적·정의·적용범위)는 정비기준상 "총칙규정"에 묶이는 내용물이다. 별도 "총칙" 단계는 두지 않는다.

---

## 5. UI 스펙 ↔ 모델 매핑

| UI 요소 | 모델 |
|---------|------|
| 단계 사이드바 8단계 + 진행률 | `Stage` (+ `Project.progress` 캐시) |
| 본칙 항목 선택 모달 → sub-stage | `Stage.parentId` self-relation |
| Editor 조 단위 본문·거터 단계 배지 | `OrdinanceSection.stageId` |
| Diff 뷰 (원본 ↔ 개정안) | `OrdinanceSection.originalBody` vs `body` (jsdiff 파생, D2) |
| 변경 카운터 `[+3 ~1 -0]` | `OrdinanceSection.changeType` 집계 |
| AI 채팅 + 근거 토글 | `Message.content` + `citations` |
| 컨텍스트 칩 (첨부 위키·참고조례) | `Message.attachments` + `Reference.includedInContext` |
| 인라인 힌트 / 정밀 검증 매트릭스 | `ValidationResult.severity` (hint/violation) |
| 검증 무시 사유 강제 | `ValidationResult.dismissedReason` |
| 타 지자체 검색·로드 | `Reference` |
| 이력 타임라인·시간여행 | `Snapshot` |
| 프로젝트 잠금 | `Project.status=locked` + `lockedAt` |

---

## 6. 미해결 (plan 단계로 이월)

- **본문 저장 단위**: 조 단위(`OrdinanceSection`)로 충분한가, 항·호 레벨 메타가 필요한가 — 정비 기준 검증 입도에 따라 결정
- **Snapshot 보존 정책**: 무한 누적 vs 단계당 N개 롤링
- **Postgres 이전 시점**: law-matcher 통합 시 `provider` 교체 + JSON·인덱스 검증
- **HWP 출력**: `pipeline/export`가 생성하는 산출물을 DB에 저장할지(파일 경로만 vs blob) — §3.4 PoC 후 결정

---

## 7. 변경 이력

| 버전 | 날짜 | 변경 |
|------|------|------|
| 1.0.0 | 2026-05-22 | 세션 2 — 데이터 모델 확정. 8엔티티(Project/Stage/OrdinanceSection/Message/ValidationResult/Reference/Snapshot). DiffHunk는 파생으로 제외, 위키는 DB 외부 유지 |
