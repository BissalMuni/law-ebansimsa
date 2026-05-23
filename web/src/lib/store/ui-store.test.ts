import { beforeEach, describe, expect, it } from "vitest";
import { useUIStore } from "./ui-store";

// Zustand UI 스토어 — 패널 토글·에디터 탭 관리 (plan §2, data-model §5)
describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.setState(useUIStore.getInitialState(), true);
  });

  it("패널은 기본적으로 사이드바·채팅이 열려 있고 하단 패널은 닫혀 있다", () => {
    const s = useUIStore.getState();
    expect(s.primarySidebarOpen).toBe(true);
    expect(s.secondarySidebarOpen).toBe(true);
    expect(s.bottomPanelOpen).toBe(false);
  });

  it("togglePanel 은 지정한 패널의 가시성을 뒤집는다", () => {
    useUIStore.getState().togglePanel("bottomPanel");
    expect(useUIStore.getState().bottomPanelOpen).toBe(true);
    useUIStore.getState().togglePanel("bottomPanel");
    expect(useUIStore.getState().bottomPanelOpen).toBe(false);
  });

  it("openTab 은 탭을 추가하고 활성 탭으로 만든다", () => {
    useUIStore.getState().openTab({ id: "sec-1", title: "제1조" });
    const s = useUIStore.getState();
    expect(s.tabs).toHaveLength(1);
    expect(s.activeTabId).toBe("sec-1");
  });

  it("openTab 은 같은 id 를 중복 추가하지 않고 활성만 바꾼다", () => {
    const { openTab } = useUIStore.getState();
    openTab({ id: "a", title: "A" });
    openTab({ id: "b", title: "B" });
    openTab({ id: "a", title: "A" });
    const s = useUIStore.getState();
    expect(s.tabs).toHaveLength(2);
    expect(s.activeTabId).toBe("a");
  });

  it("closeTab 은 탭을 제거하고 활성 탭이면 인접 탭으로 활성을 옮긴다", () => {
    const { openTab, closeTab } = useUIStore.getState();
    openTab({ id: "a", title: "A" });
    openTab({ id: "b", title: "B" });
    closeTab("b");
    const s = useUIStore.getState();
    expect(s.tabs.map((t) => t.id)).toEqual(["a"]);
    expect(s.activeTabId).toBe("a");
  });

  it("마지막 탭을 닫으면 활성 탭은 null 이 된다", () => {
    const { openTab, closeTab } = useUIStore.getState();
    openTab({ id: "a", title: "A" });
    closeTab("a");
    const s = useUIStore.getState();
    expect(s.tabs).toHaveLength(0);
    expect(s.activeTabId).toBeNull();
  });

  it("splitView 토글이 가능하다", () => {
    expect(useUIStore.getState().splitView).toBe(false);
    useUIStore.getState().toggleSplitView();
    expect(useUIStore.getState().splitView).toBe(true);
  });

  it("활성 단계는 기본 null 이며 setActiveStage 로 id·key 를 함께 설정한다", () => {
    expect(useUIStore.getState().activeStageId).toBeNull();
    expect(useUIStore.getState().activeStageKey).toBeNull();
    useUIStore.getState().setActiveStage("stage-3", "definition");
    expect(useUIStore.getState().activeStageId).toBe("stage-3");
    expect(useUIStore.getState().activeStageKey).toBe("definition");
  });
});
