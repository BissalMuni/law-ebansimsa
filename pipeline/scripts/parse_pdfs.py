"""
PDF → Wiki 마크다운 변환 스크립트

사용법: python pipeline/scripts/parse_pdfs.py

1. OpenDataLoader PDF로 전체 PDF를 마크다운으로 변환
2. TOC 기반으로 섹션별 분할
3. wiki/ 디렉토리에 개별 페이지 생성
4. index.md 업데이트
"""

import os
import re
import sys
from pathlib import Path

# Java PATH 설정 (OpenDataLoader 의존성)
JAVA_HOME = r"C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
os.environ["PATH"] = os.path.join(JAVA_HOME, "bin") + os.pathsep + os.environ["PATH"]

import opendataloader_pdf

# 프로젝트 루트
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
WIKI_DIR = PROJECT_ROOT / "wiki"
OUTPUT_DIR = PROJECT_ROOT / "output"

# PDF 정의
PDFS = [
    {
        "file": "2022 ebansimsa.pdf",
        "wiki_subdir": "ebansimsa",
        "toc_file": "toc-2022-ebansimsa.md",
        "title": "2022년 자치법규 입안 길라잡이",
    },
    {
        "file": "2025 jungbigijun.pdf",
        "wiki_subdir": "jungbigijun",
        "toc_file": "toc-2025-jungbigijun.md",
        "title": "2025년 알기 쉬운 법령 정비기준",
    },
]


def parse_toc(toc_path: Path) -> list[dict]:
    """TOC 마크다운에서 섹션 정보 추출"""
    sections = []
    content = toc_path.read_text(encoding="utf-8")

    # 페이지 번호가 있는 항목 추출
    # 패턴: "- 숫자. 제목 — p.XX" 또는 "### 제X장 제목\n- p.XX"
    lines = content.split("\n")

    current_chapter = ""
    for i, line in enumerate(lines):
        # 챕터 헤딩 (### 또는 ##)
        if line.startswith("### ") or line.startswith("## "):
            current_chapter = line.lstrip("#").strip()

        # 페이지 번호 추출
        page_match = re.search(r"p\.(\d+)", line)
        if page_match:
            page = int(page_match.group(1))

            # 제목 추출: "- 숫자. 제목 — p.XX" 또는 "- p.XX"
            title_match = re.match(r"-\s*(?:\d+\\?\.\s*)?(.+?)(?:\s*—\s*p\.\d+)?$", line)
            if title_match:
                title = title_match.group(1).strip()
                # "p.XX"만 있는 경우 챕터 이름 사용
                if title == f"p.{page}" or title.startswith("p."):
                    title = current_chapter
            else:
                title = current_chapter

            # 중복 제거
            if not sections or sections[-1]["page"] != page:
                sections.append({
                    "title": title,
                    "page": page,
                    "chapter": current_chapter,
                })

    # 다음 섹션의 시작 페이지를 end_page로 설정
    for i in range(len(sections) - 1):
        sections[i]["end_page"] = sections[i + 1]["page"] - 1
    if sections:
        sections[-1]["end_page"] = None  # 마지막 섹션은 끝까지

    return sections


def title_to_filename(title: str) -> str:
    """한글 제목을 파일명으로 변환 (kebab-case)"""
    # 특수문자 제거
    clean = re.sub(r"[·ㆍ「」『』\[\]()（）]", "", title)
    # 숫자. 접두사 제거
    clean = re.sub(r"^\d+\.\s*", "", clean)
    # 공백/특수문자를 하이픈으로
    clean = re.sub(r"[,\s/\\]+", "-", clean)
    # 연속 하이픈 정리
    clean = re.sub(r"-+", "-", clean)
    # 양쪽 하이픈 제거
    clean = clean.strip("-")
    # 길이 제한
    if len(clean) > 50:
        clean = clean[:50].rstrip("-")
    return clean


def convert_pdf_to_markdown(pdf_info: dict) -> Path:
    """OpenDataLoader로 PDF 전체를 마크다운으로 변환"""
    pdf_path = PROJECT_ROOT / pdf_info["file"]
    output_subdir = OUTPUT_DIR / pdf_info["wiki_subdir"]
    output_subdir.mkdir(parents=True, exist_ok=True)

    output_file = output_subdir / pdf_path.with_suffix(".md").name

    if output_file.exists():
        print(f"  [건너뜀] 이미 존재: {output_file.name}")
        return output_file

    print(f"  [파싱 중] {pdf_info['file']} → 마크다운...")
    opendataloader_pdf.convert(
        input_path=str(pdf_path),
        output_dir=str(output_subdir),
        format="markdown",
        markdown_page_separator="<!-- PAGE_BREAK -->",
    )
    print(f"  [완료] {output_file.name}")
    return output_file


def split_markdown_by_pages(md_path: Path) -> list[str]:
    """마크다운을 PAGE_BREAK 구분자 기준으로 페이지별로 분할"""
    full_content = md_path.read_text(encoding="utf-8")
    pages = full_content.split("<!-- PAGE_BREAK -->")
    return pages


def split_into_wiki_pages(md_path: Path, sections: list[dict], pdf_info: dict):
    """마크다운 파일을 TOC 페이지 번호 기반으로 분할하여 wiki/ 에 저장"""
    wiki_subdir = WIKI_DIR / pdf_info["wiki_subdir"]
    wiki_subdir.mkdir(parents=True, exist_ok=True)

    # 페이지별로 분할
    md_pages = split_markdown_by_pages(md_path)
    total_pdf_pages = len(md_pages)

    pages_created = []

    for section in sections:
        title = section["title"]
        filename = title_to_filename(title)
        if not filename:
            continue

        # TOC의 페이지 번호로 슬라이싱 (1-indexed → 0-indexed)
        start_page = section["page"] - 1
        end_page = section.get("end_page")
        if end_page:
            end_page = min(end_page, total_pdf_pages)
        else:
            end_page = min(start_page + 20, total_pdf_pages)  # 기본 최대 20페이지

        if start_page >= total_pdf_pages:
            continue

        # 해당 페이지 범위의 내용 합치기
        section_content = "\n\n".join(
            md_pages[i] for i in range(start_page, end_page)
            if i < len(md_pages)
        ).strip()

        if len(section_content) < 50:
            continue

        # 이미지 참조 경로 정리 (상대경로)
        section_content = re.sub(
            r"!\[([^\]]*)\]\(<([^>]+)>\)",
            r"![\1](\2)",
            section_content
        )

        # 프론트매터 + 본문
        page_content = f"""---
source: {pdf_info['file']}
pages: {section['page']}-{end_page}
section: {section['chapter']} > {title}
---

# {title}

{section_content}

> 출처: {pdf_info['file']}, p.{section['page']}
"""

        page_path = wiki_subdir / f"{filename}.md"
        page_path.write_text(page_content, encoding="utf-8")
        pages_created.append({
            "title": title,
            "path": f"wiki/{pdf_info['wiki_subdir']}/{filename}.md",
            "page": section["page"],
        })

    return pages_created


def update_index(all_pages: dict):
    """index.md 업데이트"""
    index_path = PROJECT_ROOT / "index.md"

    content = "# Law-Ebansimsa Wiki Index\n\n"
    content += "> LLM Wiki 지식베이스 — 자치법규 입안 심사 기준서\n\n"

    for pdf_key, pages in all_pages.items():
        pdf_info = next(p for p in PDFS if p["wiki_subdir"] == pdf_key)
        content += f"## {pdf_info['title']}\n\n"

        for page in pages:
            content += f"- [{page['title']}]({page['path']}) — p.{page['page']}\n"
        content += "\n"

    index_path.write_text(content, encoding="utf-8")
    print(f"\n[완료] index.md 업데이트 ({sum(len(v) for v in all_pages.values())}개 페이지)")


def main():
    print("=" * 60)
    print("PDF → Wiki 마크다운 변환")
    print("=" * 60)

    all_pages = {}

    for pdf_info in PDFS:
        print(f"\n{'=' * 40}")
        print(f"[PDF] {pdf_info['title']}")
        print(f"{'=' * 40}")

        # 1. TOC 파싱
        toc_path = PROJECT_ROOT / pdf_info["toc_file"]
        sections = parse_toc(toc_path)
        print(f"  [TOC] {len(sections)}개 섹션 발견")

        # 2. PDF → 마크다운 변환
        md_path = convert_pdf_to_markdown(pdf_info)

        # 3. 섹션별 분할 → wiki/ 저장
        pages = split_into_wiki_pages(md_path, sections, pdf_info)
        all_pages[pdf_info["wiki_subdir"]] = pages
        print(f"  [위키] {len(pages)}개 페이지 생성")

    # 4. index.md 업데이트
    update_index(all_pages)

    print("\n" + "=" * 60)
    print("완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()
