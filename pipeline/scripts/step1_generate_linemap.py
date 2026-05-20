"""
[2.6단계] 라인맵 생성

toc-coded.md의 각 헤딩을 원본 md에서 검색하여
시작줄/종료줄을 매핑한 0.x-라인맵.md를 생성한다.

사용법: python pipeline/scripts/step1_generate_linemap.py <문서폴더명>
예: python pipeline/scripts/step1_generate_linemap.py ebansimsa
"""

import sys
import re
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def normalize(s: str) -> str:
    """특수문자 제거하여 fuzzy 매칭용 정규화"""
    return re.sub(r'[^가-힣a-zA-Z0-9]', '', s).lower()


def parse_toc_coded(toc_path: Path) -> list[dict]:
    """toc-coded.md에서 코드, 제목, 페이지 추출"""
    entries = []
    with open(toc_path, 'r', encoding='utf-8') as f:
        for line in f:
            m = re.match(r'\s*[-#]*\s*(\d+(?:\.\d+)*)\s+(.+?)(?:\s*—\s*p\.(\d+))?\s*$', line)
            if m:
                entries.append({
                    'code': m.group(1),
                    'title': m.group(2).strip(),
                    'page': m.group(3),
                })
    return entries


def find_heading_line(lines: list[str], title: str, start_from: int, page_hint: str = None, content_start: int = 0, lines_per_page: float = 70) -> int:
    """원본 md에서 헤딩 텍스트를 검색하여 줄 번호 반환"""
    norm_title = normalize(title)
    total_lines = len(lines)

    # 페이지 힌트가 있으면 추정 위치 근처에서 우선 검색
    if page_hint:
        page_num = int(page_hint)
        estimated_line = content_start + int((page_num - 1) * lines_per_page)
        search_start = max(start_from, estimated_line - 500)
        search_end = min(total_lines, estimated_line + 500)

        # 정확 매칭
        for i in range(search_start, search_end):
            line_stripped = lines[i].strip().lstrip('#').strip()
            if normalize(line_stripped) == norm_title and len(line_stripped) < len(title) + 20:
                return i

        # 포함 매칭
        for i in range(search_start, search_end):
            if norm_title in normalize(lines[i]) and len(lines[i].strip()) < len(title) + 50:
                return i

    # 폴백: start_from부터 순차 검색
    for i in range(start_from, total_lines):
        line_stripped = lines[i].strip().lstrip('#').strip()
        if normalize(line_stripped) == norm_title and len(line_stripped) < len(title) + 20:
            return i

    for i in range(start_from, total_lines):
        if norm_title in normalize(lines[i]) and len(lines[i].strip()) < len(title) + 50:
            return i

    return -1


def generate_linemap(doc_name: str):
    """라인맵 생성 메인 로직"""
    output_dir = PROJECT_ROOT / 'output' / doc_name
    wiki_dir = output_dir / 'wiki'

    # toc-coded 파일 찾기
    toc_coded_path = None
    for f in sorted(wiki_dir.iterdir()):
        if '목차_코드' in f.name or 'toc-coded' in f.name.lower():
            toc_coded_path = f
            break

    if not toc_coded_path:
        print(f'ERROR: toc-coded 파일을 찾을 수 없습니다: {wiki_dir}')
        sys.exit(1)

    # 원본 md 찾기
    md_files = list(output_dir.glob('*.md'))
    md_files = [f for f in md_files if f.parent == output_dir]  # wiki/ 하위 제외
    if not md_files:
        print(f'ERROR: 원본 md 파일을 찾을 수 없습니다: {output_dir}')
        sys.exit(1)
    source_md = md_files[0]

    print(f'[라인맵 생성]')
    print(f'  toc-coded: {toc_coded_path.name}')
    print(f'  원본 md: {source_md.name}')

    # 파싱
    entries = parse_toc_coded(toc_coded_path)
    with open(source_md, 'r', encoding='utf-8') as f:
        lines = f.read().split('\n')

    total_lines = len(lines)
    print(f'  TOC 항목: {len(entries)}개')
    print(f'  원본 줄 수: {total_lines}')

    # 본문 시작 위치 & 줄/페이지 비율 추정
    # 목차 영역 이후 실제 본문이 시작되는 줄
    content_start = 700  # 보수적 기본값
    leaf_entries = [e for e in entries if e['page'] is not None]
    if leaf_entries:
        last_page = max(int(e['page']) for e in leaf_entries)
        lines_per_page = (total_lines - content_start) / last_page
    else:
        lines_per_page = 70

    print(f'  본문 시작: line {content_start}')
    print(f'  추정 줄/페이지: {lines_per_page:.1f}')

    # 각 항목의 줄 위치 검색
    results = []
    last_pos = content_start
    found_count = 0

    for entry in leaf_entries:
        pos = find_heading_line(
            lines, entry['title'], last_pos,
            page_hint=entry['page'],
            content_start=content_start,
            lines_per_page=lines_per_page
        )
        if pos == -1 or pos < content_start:
            pos = find_heading_line(
                lines, entry['title'], content_start,
                page_hint=entry['page'],
                content_start=content_start,
                lines_per_page=lines_per_page
            )

        entry['line'] = pos
        results.append(entry)

        if pos >= 0:
            found_count += 1
            last_pos = pos + 1

    # 종료줄 계산
    valid_results = [r for r in results if r['line'] >= 0]
    valid_results.sort(key=lambda x: x['line'])

    for i, r in enumerate(valid_results):
        if i + 1 < len(valid_results):
            r['end_line'] = valid_results[i + 1]['line'] - 1
        else:
            r['end_line'] = total_lines - 1

    # 라인맵 md 생성
    map_lines = []
    map_lines.append(f'# {doc_name} — 라인 맵')
    map_lines.append('')
    map_lines.append(f'> 원본: `{source_md.name}` | TOC 기준 헤딩별 시작/종료 라인')
    map_lines.append(f'> 검색 결과: {found_count}/{len(leaf_entries)} 항목 발견')
    map_lines.append('')
    map_lines.append('| 코드 | 제목 | 시작 줄 | 종료 줄 | 줄 수 | 상태 |')
    map_lines.append('|------|------|---------|---------|-------|------|')

    # 모든 항목 출력 (못 찾은 것도 포함)
    for r in results:
        if r['line'] >= 0:
            end = next((v['end_line'] for v in valid_results if v['code'] == r['code']), '?')
            line_count = end - r['line'] + 1 if isinstance(end, int) else '?'
            map_lines.append(f"| {r['code']} | {r['title']} | {r['line'] + 1} | {end + 1 if isinstance(end, int) else '?'} | {line_count} | ✓ |")
        else:
            map_lines.append(f"| {r['code']} | {r['title']} | — | — | — | ✗ not_found |")

    # 라인맵 파일 번호 결정
    existing_0x = sorted([f.name for f in wiki_dir.iterdir() if f.name.startswith('0.')])
    next_num = len(existing_0x) + 1
    # 기존 라인맵이 있으면 덮어쓰기
    linemap_path = None
    for f in wiki_dir.iterdir():
        if '라인맵' in f.name:
            linemap_path = f
            break
    if not linemap_path:
        linemap_path = wiki_dir / f'0.{next_num}-라인맵.md'

    with open(linemap_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(map_lines) + '\n')

    print(f'\n  [완료] {linemap_path.name}')
    print(f'  발견: {found_count}/{len(leaf_entries)}')
    not_found = [r for r in results if r['line'] < 0]
    if not_found:
        print(f'  미발견 ({len(not_found)}):')
        for r in not_found:
            print(f"    {r['code']} {r['title']} (p.{r['page']})")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('사용법: python step1_generate_linemap.py <문서폴더명>')
        print('예: python step1_generate_linemap.py ebansimsa')
        sys.exit(1)

    doc_name = sys.argv[1]
    generate_linemap(doc_name)
