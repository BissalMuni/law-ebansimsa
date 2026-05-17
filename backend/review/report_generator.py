"""심사 보고서 생성 모듈"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from .models import ReviewMatrix, Verdict
from .result_aggregator import aggregate_results


def generate_markdown_report(
    matrix: ReviewMatrix,
    output_path: Path,
    ordinance_name: str = "조례안",
) -> None:
    """마크다운 심사 보고서 생성"""
    results = aggregate_results(matrix)
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines = [
        f"# {ordinance_name} — 심사 보고서",
        f"",
        f"> 생성: {now}",
        f"> 총 셀: {results['total_cells']} | 완료: {results['completed']} ({results['completion_rate']})",
        f"",
        f"## 요약",
        f"",
        f"| 판정 | 건수 |",
        f"|------|------|",
    ]

    for verdict_name, count in results["summary"].items():
        lines.append(f"| {verdict_name} | {count} |")

    lines.append("")

    # 부적합 항목
    failures = results["failures"]
    if failures:
        lines.append(f"## 부적합 항목 ({len(failures)}건)")
        lines.append("")
        lines.append("| 조문 | 기준 | 사유 | 개선 제안 |")
        lines.append("|------|------|------|----------|")

        for f in failures:
            reason = (f["reason"] or "").replace("|", "\\|").replace("\n", " ")
            suggestion = (f["suggestion"] or "-").replace("|", "\\|").replace("\n", " ")
            lines.append(f"| {f['article_id']} | {f['criterion_id']} | {reason} | {suggestion} |")

        lines.append("")
    else:
        lines.append("## 부적합 항목 없음")
        lines.append("")

    # 전체 매트릭스 (축약)
    lines.append("## 전체 매트릭스")
    lines.append("")
    lines.append("| 조문 | 기준 | 판정 |")
    lines.append("|------|------|------|")

    for cell in sorted(matrix.cells.values(), key=lambda c: (c.article_id, c.criterion_id)):
        if cell.stage1_relevant is False:
            verdict_str = "—"
        elif cell.verdict:
            verdict_str = cell.verdict.value
        else:
            verdict_str = "⏳"
        lines.append(f"| {cell.article_id} | {cell.criterion_id} | {verdict_str} |")

    lines.append("")

    output_path.write_text("\n".join(lines), encoding="utf-8")


def generate_json_report(
    matrix: ReviewMatrix,
    output_path: Path,
) -> None:
    """JSON 심사 보고서 생성"""
    results = aggregate_results(matrix)
    results["generated_at"] = datetime.now().isoformat()
    output_path.write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
