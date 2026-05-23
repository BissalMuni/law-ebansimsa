// 개정 diff — 조 단위 정렬·변경 카운트 (US6, FR-010). 파생물이므로 영속하지 않는다 (D2).
export type ChangeType = "unchanged" | "add" | "modify" | "delete";

export interface DiffArticle {
  articleNo: number;
  body: string;
}

export interface AlignedChange {
  articleNo: number;
  changeType: ChangeType;
}

export interface ChangeCounts {
  added: number;
  modified: number;
  deleted: number;
  unchanged: number;
}

// 원본 ↔ 개정안을 조번호 기준으로 정렬해 각 조의 변경 유형을 산출
export function alignArticles(
  original: DiffArticle[],
  modified: DiffArticle[],
): AlignedChange[] {
  const result: AlignedChange[] = [];
  const origByNo = new Map(original.map((a) => [a.articleNo, a]));

  for (const m of modified) {
    const o = origByNo.get(m.articleNo);
    if (!o) {
      result.push({ articleNo: m.articleNo, changeType: "add" });
    } else if (o.body !== m.body) {
      result.push({ articleNo: m.articleNo, changeType: "modify" });
    } else {
      result.push({ articleNo: m.articleNo, changeType: "unchanged" });
    }
  }

  // 개정안에 없는 원본 조는 삭제
  const modNos = new Set(modified.map((m) => m.articleNo));
  for (const o of original) {
    if (!modNos.has(o.articleNo)) {
      result.push({ articleNo: o.articleNo, changeType: "delete" });
    }
  }

  return result.sort((a, b) => a.articleNo - b.articleNo);
}

export function countChanges(changes: AlignedChange[]): ChangeCounts {
  const counts: ChangeCounts = {
    added: 0,
    modified: 0,
    deleted: 0,
    unchanged: 0,
  };
  for (const c of changes) {
    if (c.changeType === "add") counts.added++;
    else if (c.changeType === "modify") counts.modified++;
    else if (c.changeType === "delete") counts.deleted++;
    else counts.unchanged++;
  }
  return counts;
}

// 변경 카운터 표기 (ui-spec §6.2: 제2조 [+3 ~1 -0])
export function formatChangeCount(c: ChangeCounts): string {
  return `[+${c.added} ~${c.modified} -${c.deleted}]`;
}
