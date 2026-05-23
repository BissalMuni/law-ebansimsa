// 3중 인코딩 — 색 외에 기호·텍스트로도 상태/판정을 전달 (헌법 P5, WCAG AA).
import type { StageStatus } from "./stages";
import type { ValidationCellResult } from "./api-client";

export interface Encoding {
  symbol: string; // 색에 의존하지 않는 기호
  text: string; // 스크린리더·시각 텍스트
}

export const STATUS_ENCODING: Record<StageStatus, Encoding> = {
  locked: { symbol: "○", text: "잠김" },
  available: { symbol: "◓", text: "진입 가능" },
  in_progress: { symbol: "◐", text: "작성 중" },
  validating: { symbol: "◌", text: "검증 중" },
  confirmed: { symbol: "●", text: "확정 완료" },
  stale: { symbol: "△", text: "재검토 필요" },
  failed: { symbol: "✗", text: "검증 실패" },
};

export const VERDICT_ENCODING: Record<
  ValidationCellResult["verdict"],
  Encoding
> = {
  pass: { symbol: "✓", text: "충족" },
  fail: { symbol: "✗", text: "위반" },
  na: { symbol: "—", text: "해당없음" },
  pending: { symbol: "?", text: "미판정" },
};
