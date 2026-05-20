"""심사 기준 로드 및 레지스트리 관리 모듈"""

from __future__ import annotations

import json
import re
from pathlib import Path

from .models import Criterion, CriterionScope


PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


# document_level로 분류할 섹션 코드 패턴
_DOCUMENT_LEVEL_PATTERNS = [
    # ebansimsa 총칙규정 (목적, 정의, 적용범위 등)
    re.compile(r'^ebansimsa/2\.1\.\d+$'),
    # ebansimsa 부칙규정
    re.compile(r'^ebansimsa/2\.3\.\d+$'),
    # ebansimsa 체제 (제명, 본칙/부칙 체제, 작성 형식)
    re.compile(r'^ebansimsa/3\.1\.\d+$'),
    # ebansimsa 체크리스트, 입법 절차
    re.compile(r'^ebansimsa/4\.\d'),
]


def _is_document_level(criterion_id: str) -> bool:
    """기준이 document_level인지 판단 (초기 자동 분류)"""
    return any(p.match(criterion_id) for p in _DOCUMENT_LEVEL_PATTERNS)


def _count_text_lines(content: str) -> int:
    """이미지/빈줄/PAGE_BREAK를 제외한 실제 텍스트 줄 수"""
    count = 0
    for line in content.split('\n'):
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith('!['):
            continue
        if '<!-- PAGE_BREAK -->' in stripped:
            continue
        if stripped.startswith('---'):
            continue
        count += 1
    return count


def build_default_registry(wiki_base: Path | None = None) -> dict:
    """
    wiki 디렉토리를 스캔하여 criteria_registry.json 초안을 생성한다.

    - 0.x 메타 파일 제외
    - 텍스트 줄 수가 10줄 미만인 스텁 파일 비활성화
    - scope 자동 분류 (수동 검수 필요)
    """
    if wiki_base is None:
        wiki_base = PROJECT_ROOT / 'output'

    registry = {"version": 1, "criteria": [], "excluded": []}

    for doc_dir in sorted(wiki_base.iterdir()):
        if not doc_dir.is_dir():
            continue
        wiki_dir = doc_dir / 'wiki'
        if not wiki_dir.exists():
            continue

        doc_name = doc_dir.name  # ebansimsa, jungbigijun

        for wiki_file in sorted(wiki_dir.glob('*.md')):
            # 0.x 메타 파일 스킵
            if wiki_file.name.startswith('0.'):
                registry["excluded"].append({
                    "id": f"{doc_name}/{wiki_file.stem.split('-')[0]}",
                    "reason": "meta file",
                })
                continue

            # 코드 추출 (파일명에서)
            code = wiki_file.name.split('-')[0]
            criterion_id = f"{doc_name}/{code}"

            # 제목 추출 (파일명에서 코드 제거)
            title_part = wiki_file.stem[len(code) + 1:]  # 코드- 이후
            title = title_part.replace('_', ' ')

            # 내용 읽기
            content = wiki_file.read_text(encoding='utf-8')
            text_lines = _count_text_lines(content)

            # 스텁 파일 (텍스트 10줄 미만) 비활성화
            if text_lines < 10:
                registry["excluded"].append({
                    "id": criterion_id,
                    "reason": f"stub ({text_lines} text lines)",
                })
                continue

            scope = (
                CriterionScope.DOCUMENT_LEVEL
                if _is_document_level(criterion_id)
                else CriterionScope.PER_ARTICLE
            )

            registry["criteria"].append({
                "id": criterion_id,
                "title": title,
                "scope": scope.value,
                "wiki_path": str(wiki_file.relative_to(PROJECT_ROOT)),
                "enabled": True,
                "text_lines": text_lines,
            })

    return registry


def save_registry(registry: dict, path: Path | None = None) -> Path:
    """레지스트리를 JSON으로 저장"""
    if path is None:
        path = PROJECT_ROOT / 'pipeline' / 'config' / 'criteria_registry.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(registry, ensure_ascii=False, indent=2),
        encoding='utf-8',
    )
    return path


def load_criteria(
    registry_path: Path | None = None,
    load_content: bool = True,
) -> list[Criterion]:
    """
    레지스트리에서 활성 기준을 로드한다.

    Args:
        registry_path: criteria_registry.json 경로
        load_content: wiki 파일 내용도 함께 로드할지

    Returns:
        활성화된 Criterion 리스트
    """
    if registry_path is None:
        registry_path = PROJECT_ROOT / 'pipeline' / 'config' / 'criteria_registry.json'

    data = json.loads(registry_path.read_text(encoding='utf-8'))

    criteria = []
    for entry in data["criteria"]:
        if not entry.get("enabled", True):
            continue

        criterion = Criterion(
            id=entry["id"],
            title=entry["title"],
            scope=CriterionScope(entry["scope"]),
            wiki_path=entry["wiki_path"],
        )

        if load_content:
            wiki_path = PROJECT_ROOT / entry["wiki_path"]
            if wiki_path.exists():
                raw = wiki_path.read_text(encoding='utf-8')
                # frontmatter 제거
                if raw.startswith('---'):
                    end = raw.find('---', 3)
                    if end != -1:
                        raw = raw[end + 3:].strip()
                criterion.content = raw

        criteria.append(criterion)

    return criteria


if __name__ == '__main__':
    # 레지스트리 초기 생성
    registry = build_default_registry()
    path = save_registry(registry)

    enabled = [c for c in registry["criteria"] if c.get("enabled", True)]
    excluded = registry["excluded"]
    doc_level = [c for c in enabled if c["scope"] == "document_level"]
    per_article = [c for c in enabled if c["scope"] == "per_article"]

    print(f"[기준 레지스트리 생성]")
    print(f"  활성: {len(enabled)}개 (document_level: {len(doc_level)}, per_article: {len(per_article)})")
    print(f"  제외: {len(excluded)}개")
    print(f"  저장: {path}")
