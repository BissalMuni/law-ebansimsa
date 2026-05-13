# Law Ebansimsa — LLM Wiki Schema

## 프로젝트 개요
Karpathy의 LLM Wiki 패턴을 적용하여 법제처 발간 법령 문서를 구조화된 지식 베이스로 구축하는 프로젝트.

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
