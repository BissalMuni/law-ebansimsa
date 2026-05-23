// 최종안 출력 — 내보내기 요청 본문·파일명 구성 (US9, FR-013). 순수.

export interface ExportableSection {
  articleNo: number;
  articleLabel?: string | null;
  title: string;
  body: string;
  order: number;
}

export interface ExportSection {
  article_label: string;
  title: string;
  body: string;
  order: number;
}

// 조문을 order 순으로 정렬해 /export 본문 형태로 변환
export function buildExportSections(
  sections: ExportableSection[],
): ExportSection[] {
  return [...sections]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      article_label: s.articleLabel ?? `제${s.articleNo}조`,
      title: s.title,
      body: s.body,
      order: s.order,
    }));
}

// 파일명 — 금지 문자 치환 (출력물은 온디맨드, 비영속 P7)
export function exportFilename(title: string, format: "docx" | "pdf"): string {
  const safe = title.replace(/[\\/:*?"<>|]/g, "_");
  return `${safe}.${format}`;
}
