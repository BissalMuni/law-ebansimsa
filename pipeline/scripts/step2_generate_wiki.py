"""
[3단계] 라인맵 기준으로 위키 파일 생성

0.x-라인맵.md를 읽어서 원본 md를 슬라이싱하고
각 섹션별 위키 파일을 생성한다.

사용법: python pipeline/scripts/step2_generate_wiki.py <문서폴더명>
예: python pipeline/scripts/step2_generate_wiki.py ebansimsa
"""

import sys
import re
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def parse_linemap(linemap_path: Path) -> list[dict]:
    """라인맵 md에서 코드, 제목, 시작줄, 종료줄 추출"""
    entries = []
    with open(linemap_path, 'r', encoding='utf-8') as f:
        for line in f:
            # 5열 형식: | 코드 | 제목 | 시작 줄 | 종료 줄 | 줄 수 |
            # 볼드 마커(**) 허용
            m = re.match(
                r'\|\s*\**(\d+(?:\.\d+)*)\**\s*\|'   # 코드
                r'\s*\**(.+?)\**\s*\|'                 # 제목
                r'\s*(\d+|)\s*\|'                      # 시작 줄 (빈칸 가능)
                r'\s*(\d+|)\s*\|'                      # 종료 줄 (빈칸 가능)
                r'\s*(\d+|)\s*\|',                     # 줄 수 (빈칸 가능)
                line
            )
            if m:
                code = m.group(1)
                title = m.group(2).strip()
                start = m.group(3).strip()
                end = m.group(4).strip()

                if not start:
                    # 대목차 (시작줄 없음) — 스킵
                    continue

                entries.append({
                    'code': code,
                    'title': title,
                    'start': int(start),
                    'end': int(end) if end else None,
                    'status': 'found',
                })
    return entries


def code_to_filename(code: str, title: str) -> str:
    """헤딩코드 + 제목 → 파일명 생성
    - 코드와 제목은 대시(-)로 연결
    - 한글 공백은 언더바(_)로 처리
    """
    clean_title = re.sub(r'[^가-힣a-zA-Z0-9\s]', '', title)
    clean_title = clean_title.strip().replace(' ', '_')
    return f'{code}-{clean_title}.md'


def generate_wiki(doc_name: str):
    """라인맵 기준으로 위키 파일 생성"""
    output_dir = PROJECT_ROOT / 'output' / doc_name
    wiki_dir = output_dir / 'wiki'

    # 라인맵 파일 찾기
    linemap_path = None
    for f in wiki_dir.iterdir():
        if '라인맵' in f.name:
            linemap_path = f
            break

    if not linemap_path:
        print(f'ERROR: 라인맵 파일을 찾을 수 없습니다: {wiki_dir}')
        sys.exit(1)

    # 원본 md 찾기
    md_files = [f for f in output_dir.glob('*.md') if f.parent == output_dir]
    if not md_files:
        print(f'ERROR: 원본 md 파일을 찾을 수 없습니다: {output_dir}')
        sys.exit(1)
    source_md = md_files[0]

    print(f'[위키 생성]')
    print(f'  라인맵: {linemap_path.name}')
    print(f'  원본 md: {source_md.name}')

    # 파싱
    entries = parse_linemap(linemap_path)
    with open(source_md, 'r', encoding='utf-8') as f:
        lines = f.read().split('\n')

    print(f'  라인맵 항목: {len(entries)}개')

    # 기존 본문 wiki 파일 삭제 (0.x 유지)
    deleted = 0
    for f in wiki_dir.iterdir():
        if f.suffix == '.md' and not f.name.startswith('0.'):
            f.unlink()
            deleted += 1
    if deleted:
        print(f'  기존 파일 {deleted}개 삭제')

    # 위키 파일 생성
    created = 0
    not_found = 0

    for entry in entries:
        filename = code_to_filename(entry['code'], entry['title'])
        filepath = wiki_dir / filename

        if entry['status'] == 'not_found':
            # 못 찾은 항목도 파일 생성 (status: not_found 표시)
            wiki_content = (
                f'---\n'
                f'source: {source_md.name}\n'
                f'section: "{entry["code"]} {entry["title"]}"\n'
                f'status: not_found\n'
                f'---\n\n'
                f'> 이 섹션은 원본 md에서 자동 검색 불가. 수동 확인 필요.\n'
            )
            filepath.write_text(wiki_content, encoding='utf-8')
            not_found += 1
        else:
            # 정상 슬라이싱
            start = entry['start'] - 1  # 1-based → 0-based
            end = entry['end'] if entry['end'] else len(lines)
            section_content = '\n'.join(lines[start:end]).strip()

            wiki_content = (
                f'---\n'
                f'source: {source_md.name}\n'
                f'section: "{entry["code"]} {entry["title"]}"\n'
                f'lines: {entry["start"]}-{entry["end"]}\n'
                f'---\n\n'
                f'{section_content}\n'
            )
            filepath.write_text(wiki_content, encoding='utf-8')
            created += 1

    print(f'\n  [완료]')
    print(f'  생성: {created}개')
    print(f'  미발견(placeholder): {not_found}개')
    print(f'  총: {created + not_found}개')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('사용법: python step2_generate_wiki.py <문서폴더명>')
        print('예: python step2_generate_wiki.py ebansimsa')
        sys.exit(1)

    doc_name = sys.argv[1]
    generate_wiki(doc_name)
