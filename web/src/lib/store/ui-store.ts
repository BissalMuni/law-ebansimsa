import { create } from "zustand";

// 에디터 탭 — 조문/위키/참고조례 등 열린 문서 (data-model §5, FR-014)
export interface EditorTab {
  id: string;
  title: string;
}

// 토글 가능한 패널 키 (VS Code 6대 영역 중 가변 영역)
export type PanelKey = "primarySidebar" | "secondarySidebar" | "bottomPanel";

interface UIState {
  // 패널 가시성: 1차 사이드바(단계), 2차 사이드바(AI 채팅), 하단 패널(문제)
  primarySidebarOpen: boolean;
  secondarySidebarOpen: boolean;
  bottomPanelOpen: boolean;
  // 에디터 탭·분할 뷰
  tabs: EditorTab[];
  activeTabId: string | null;
  splitView: boolean;

  togglePanel: (panel: PanelKey) => void;
  openTab: (tab: EditorTab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  toggleSplitView: () => void;
}

const PANEL_FIELD: Record<PanelKey, keyof UIState> = {
  primarySidebar: "primarySidebarOpen",
  secondarySidebar: "secondarySidebarOpen",
  bottomPanel: "bottomPanelOpen",
};

export const useUIStore = create<UIState>((set) => ({
  primarySidebarOpen: true,
  secondarySidebarOpen: true,
  bottomPanelOpen: false,
  tabs: [],
  activeTabId: null,
  splitView: false,

  togglePanel: (panel) =>
    set((state) => {
      const field = PANEL_FIELD[panel];
      return { [field]: !state[field] } as Partial<UIState>;
    }),

  openTab: (tab) =>
    set((state) => {
      // 이미 열린 탭이면 활성만 변경 (중복 추가 금지)
      if (state.tabs.some((t) => t.id === tab.id)) {
        return { activeTabId: tab.id };
      }
      return { tabs: [...state.tabs, tab], activeTabId: tab.id };
    }),

  closeTab: (id) =>
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === id);
      if (idx === -1) return {};
      const tabs = state.tabs.filter((t) => t.id !== id);
      let activeTabId = state.activeTabId;
      // 닫는 탭이 활성 탭이면 인접 탭으로 활성을 옮긴다
      if (state.activeTabId === id) {
        const neighbor = tabs[idx] ?? tabs[idx - 1] ?? null;
        activeTabId = neighbor ? neighbor.id : null;
      }
      return { tabs, activeTabId };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  toggleSplitView: () => set((state) => ({ splitView: !state.splitView })),
}));
