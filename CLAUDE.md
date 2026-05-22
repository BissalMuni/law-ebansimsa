# Law Ebansimsa — LLM Wiki Schema

## 프로젝트 개요
Karpathy의 LLM Wiki 패턴을 적용하여 법제처 발간 법령 문서를 구조화된 지식 베이스로 구축하는 프로젝트.

## Spec-Driven Development
프론트엔드/백엔드 앱은 spec-kit 워크플로우를 따른다: constitution → spec → plan → tasks → implement.
- 프로젝트 명세는 `.spec/` 참조 (`constitution.md`가 NON-NEGOTIABLE 원칙)
- 설계 산출물: `design/ui-spec.md`(무엇을), `design/review-notes.md`(왜+스택), `design/data-model.md`(데이터)
- 프론트 패키지 매니저 pnpm·테스트 vitest, 백엔드 uv·pytest

## 아키텍처
- **Raw Sources**: `*.pdf` 파일 (불변, 수정 금지)
- **Wiki**: `wiki/` 디렉토리 아래 마크다운 파일 (LLM이 생성·관리)
- **Schema**: 이 파일 (`CLAUDE.md`)

## 워크플로우

### Ingest
1. PDF에서 목차(TOC) 추출 → `toc-*.md`
2. 섹션별 텍스트 추출 (PyMuPDF)
3. 위키 페이지 생성 → `wiki/` 하위
4. `index.md` 업데이트

### Query
- `index.md` → 관련 위키 페이지 탐색 → 답변
- 가치 있는 결과는 새 위키 페이지로 환원

### Lint
- 모순 탐지, 상호참조 점검, 누락 보완

## 컨벤션
- 파일명: 한글 kebab-case (예: `자치법규-입안-기본원칙.md`)
- 페이지 참조: `> 출처: 파일명, p.XX` 형식
- 상호참조: `[링크텍스트](파일명.md)` 형식

### Wiki Frontmatter

모든 wiki 파일 상단에 YAML frontmatter 필수:

```yaml
---
source: 2022_ebansimsa.md    # 항상 md 파일 (pdf 아님)
section: "2.1.4 정의규정"     # 섹션 번호 + 제목
lines: 2963-3213             # 소스 md 내 라인 범위
---
```

- 메타 파일(0.x)은 `type: meta` 추가

### 목차 코드 (`0.2.2-목차_코드.md`)

- 헤딩(`##`) 사용 금지 — 모든 항목을 중첩 리스트(`- `)로 표현
- 최상위 번호: dot 없이 `1`, `2`, `3` (ordered list `1.` 아님)
- 하위 번호: dot 구분자 `1.1`, `1.2.1`
- 들여쓰기: 레벨당 스페이스 2칸
