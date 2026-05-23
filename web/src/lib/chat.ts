// 채팅 스트림 누적 로직 — 순수 함수. api-client 의 DraftEvent 를 메시지 상태로 환원.
import type { DraftEvent } from "./api-client";

export interface DraftState {
  content: string;
  citations: string[];
  done: boolean;
}

export function initialDraftState(): DraftState {
  return { content: "", citations: [], done: false };
}

// SSE 이벤트 1건을 누적 상태에 반영 (citations 설정 / delta 누적 / done 종료)
export function applyDraftEvent(state: DraftState, event: DraftEvent): DraftState {
  switch (event.type) {
    case "citations":
      return { ...state, citations: event.citations };
    case "delta":
      return { ...state, content: state.content + event.text };
    case "done":
      return { ...state, done: true };
    default:
      return state;
  }
}

// 근거(citations)가 비면 "기준에 없음" 으로 표기해야 한다 (헌법 P1, FR-005a)
export function hasNoBasis(citations: string[]): boolean {
  return citations.length === 0;
}
