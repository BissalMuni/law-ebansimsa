import { create } from "zustand";
import type { ValidationCellResult } from "@/lib/api-client";

// 인라인 힌트 보관 — Editor 가 채우고 ProblemsPanel 이 읽는다 (T032, FR-006)
interface ProblemsState {
  hints: ValidationCellResult[];
  setHints: (hints: ValidationCellResult[]) => void;
  clear: () => void;
}

export const useProblemsStore = create<ProblemsState>((set) => ({
  hints: [],
  setHints: (hints) => set({ hints }),
  clear: () => set({ hints: [] }),
}));
