"""
[2.7단계] 라인맵 검증

라인맵의 각 시작줄에 해당하는 원본 md의 실제 텍스트를 추출하여
목차 코드의 제목과 비교한다.

사용법: python backend/scripts/step1_5_verify_linemap.py <문서폴더명>
예: python backend/scripts/step1_5_verify_linemap.py ebansimsa
"""

import sys
import re
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def normalize(s: str) -> str:
    """비교용 정규화: 특수문자, 공백, 기호, 헤딩번호 제거"""
    s = re.sub(r'^[#\s]+', '', s)           # 헤딩 마크 제거
    s = re.sub(r'^\d+[\.\)]\s*', '', s)     # 앞의 번호 (5. / 1) 등) 제거
    s = re.sub(r'^[가-차]\.\s*', '', s)      # 가. 나. 다. 등 제거
    return re.sub(r'[^가-힣a-zA-Z0-9]', '', s).lower()


def similarity(a: str, b: str) -> int:
    """두 문자열의 유사도를 0~100%로 반환 (정규화 후 비교)"""
    na = normalize(a)
    nb = normalize(b)
    if not na or not nb:
        return 0
    if na == nb:
        return 100
    # 짧은 쪽이 긴 쪽에 포함되면 포함 비율 계산
    shorter, longer = (na, nb) if len(na) <= len(nb) else (nb, na)
    if shorter in longer:
        return int(len(shorter) / len(longer) * 100)
    # 공통 문자 비율
    common = sum(1 for c in shorter if c in longer)
    return int(common / max(len(shorter), len(longer)) * 100)


def parse_linemap(linemap_path: Path) -> list[dict]:
    """라인맵에서 코드, 제목, 시작줄 추출"""
    entries = []
    with open(linemap_path, 'r', encoding='utf-8') as f:
        for line in f:
            m = re.match(
                r'\|\s*(\d+(?:\.\d+)*)\s*\|\s*(.+?)\s*\|\s*(\d+|—)\s*\|',
                line
            )
            if m:
                code = m.group(1)
                title = m.group(2).strip()
                start = m.group(3)
                entries.append({
                    'code': code,
                    'title': title,
                    'start': int(start) if start != '—' else None,
                })
    return entries


def verify_linemap(doc_name: str):
    """라인맵 검증 메인 로직"""
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

    print(f'[라인맵 검증]')
    print(f'  라인맵: {linemap_path.name}')
    print(f'  원본 md: {source_md.name}')

    # 파싱
    entries = parse_linemap(linemap_path)
    with open(source_md, 'r', encoding='utf-8') as f:
        lines = f.read().split('\n')

    total = len(entries)
    ok_count = 0
    warn_count = 0
    fail_count = 0

    # 검증 결과 파일 생성
    result_lines = []
    result_lines.append(f'# {doc_name} — 라인맵 검증 결과')
    result_lines.append('')
    result_lines.append(f'> 원본: `{source_md.name}`')
    result_lines.append('')
    result_lines.append('| 코드 | TOC 제목 | 시작줄 | 원본 텍스트 | 유사도 | 결과 |')
    result_lines.append('|------|----------|--------|------------|--------|------|')

    for entry in entries:
        code = entry['code']
        title = entry['title']
        start = entry['start']

        if start is None:
            result_lines.append(f'| {code} | {title} | — | — | 0% | ❌ not_found |')
            fail_count += 1
            continue

        # 원본 md에서 해당 줄 텍스트 추출 (1-based → 0-based)
        idx = start - 1
        if idx < 0 or idx >= len(lines):
            result_lines.append(f'| {code} | {title} | {start} | OUT OF RANGE | 0% | ❌ |')
            fail_count += 1
            continue

        actual_text = lines[idx].strip().lstrip('#').strip()
        sim = similarity(title, actual_text)

        # 판정
        if sim == 100:
            status = '✅'
            ok_count += 1
        elif sim >= 50:
            status = '⚠️ 부분일치'
            warn_count += 1
        else:
            status = '❌ 불일치'
            fail_count += 1

        # 텍스트 60자 제한
        display_text = actual_text[:60] + ('...' if len(actual_text) > 60 else '')
        result_lines.append(f'| {code} | {title} | {start} | {display_text} | {sim}% | {status} |')

    # 요약
    result_lines.insert(3, f'> 결과: ✅ {ok_count} / ⚠️ {warn_count} / ❌ {fail_count} (총 {total})')

    # 파일 저장
    verify_path = wiki_dir / '0.2.4-라인맵_검증.md'
    with open(verify_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(result_lines) + '\n')

    # 콘솔 출력
    print(f'\n  ✅ 일치: {ok_count}')
    print(f'  ⚠️  부분일치: {warn_count}')
    print(f'  ❌ 불일치: {fail_count}')
    print(f'  총: {total}')
    print(f'\n  [저장] {verify_path.name}')

    if fail_count > 0:
        print(f'\n  ⚠️  불일치 항목:')
        for entry in entries:
            if entry['start'] is None:
                print(f'    {entry["code"]} {entry["title"]} → not_found')
                continue
            idx = entry['start'] - 1
            if idx < 0 or idx >= len(lines):
                print(f'    {entry["code"]} {entry["title"]} → OUT OF RANGE')
                continue
            actual = lines[idx].strip().lstrip('#').strip()
            if normalize(entry['title']) != normalize(actual) and normalize(entry['title']) not in normalize(actual) and normalize(actual) not in normalize(entry['title']):
                print(f'    {entry["code"]} (line {entry["start"]})')
                print(f'      TOC:  {entry["title"]}')
                print(f'      실제: {actual[:80]}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('사용법: python step1_5_verify_linemap.py <문서폴더명>')
        print('예: python step1_5_verify_linemap.py ebansimsa')
        sys.exit(1)

    doc_name = sys.argv[1]
    verify_linemap(doc_name)
