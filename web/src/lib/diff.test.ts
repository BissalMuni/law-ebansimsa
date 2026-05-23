// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  alignArticles,
  countChanges,
  formatChangeCount,
  type DiffArticle,
} from "./diff";

const original: DiffArticle[] = [
  { articleNo: 1, body: "목적 원본" },
  { articleNo: 2, body: "정의 원본" },
  { articleNo: 3, body: "삭제될 조" },
];

describe("alignArticles (조 단위 정렬, US6/FR-010)", () => {
  it("같은 조번호·동일 본문은 unchanged", () => {
    const modified: DiffArticle[] = [{ articleNo: 1, body: "목적 원본" }];
    const aligned = alignArticles([original[0]], modified);
    expect(aligned[0]).toEqual({ articleNo: 1, changeType: "unchanged" });
  });

  it("본문이 바뀌면 modify", () => {
    const modified: DiffArticle[] = [{ articleNo: 1, body: "목적 수정됨" }];
    const aligned = alignArticles([original[0]], modified);
    expect(aligned[0].changeType).toBe("modify");
  });

  it("원본에 없던 조번호는 add", () => {
    const modified: DiffArticle[] = [{ articleNo: 9, body: "신설 조" }];
    const aligned = alignArticles([], modified);
    expect(aligned[0].changeType).toBe("add");
  });

  it("수정안에 없는 원본 조는 delete", () => {
    const aligned = alignArticles(original, [
      { articleNo: 1, body: "목적 원본" },
      { articleNo: 2, body: "정의 원본" },
    ]);
    expect(aligned.find((a) => a.articleNo === 3)?.changeType).toBe("delete");
  });
});

describe("countChanges + formatChangeCount", () => {
  it("변경 유형별로 집계한다", () => {
    const modified: DiffArticle[] = [
      { articleNo: 1, body: "목적 수정됨" }, // modify
      { articleNo: 2, body: "정의 원본" }, // unchanged
      { articleNo: 4, body: "신설" }, // add
      // 3번 삭제
    ];
    const counts = countChanges(alignArticles(original, modified));
    expect(counts).toEqual({ added: 1, modified: 1, deleted: 1, unchanged: 1 });
  });

  it("변경 카운트를 [+a ~m -d] 형식으로 표기한다", () => {
    expect(formatChangeCount({ added: 3, modified: 1, deleted: 0, unchanged: 5 })).toBe(
      "[+3 ~1 -0]",
    );
  });
});
