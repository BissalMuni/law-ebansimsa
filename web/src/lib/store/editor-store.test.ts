// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "./editor-store";

// 에디터 문서 모델 — 탭별 본문/읽기전용/언어 (FR-014 멀티탭 지원)
describe("useEditorStore", () => {
  beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState(), true);
  });

  it("upsertDocument 는 문서를 등록한다", () => {
    useEditorStore.getState().upsertDocument({
      id: "sec-1",
      title: "제1조",
      value: "제1조(목적)",
    });
    const doc = useEditorStore.getState().documents["sec-1"];
    expect(doc.value).toBe("제1조(목적)");
    expect(doc.readOnly).toBe(false);
  });

  it("upsertDocument 는 같은 id 를 덮어쓴다", () => {
    const { upsertDocument } = useEditorStore.getState();
    upsertDocument({ id: "a", title: "A", value: "1" });
    upsertDocument({ id: "a", title: "A", value: "2", readOnly: true });
    const doc = useEditorStore.getState().documents["a"];
    expect(doc.value).toBe("2");
    expect(doc.readOnly).toBe(true);
  });

  it("setValue 는 본문만 갱신한다", () => {
    useEditorStore.getState().upsertDocument({ id: "a", title: "A", value: "old" });
    useEditorStore.getState().setValue("a", "new");
    expect(useEditorStore.getState().documents["a"].value).toBe("new");
  });

  it("읽기전용 문서는 setValue 로 변경되지 않는다 (원본 보호, US6)", () => {
    useEditorStore.getState().upsertDocument({
      id: "orig",
      title: "원본",
      value: "원본내용",
      readOnly: true,
    });
    useEditorStore.getState().setValue("orig", "변조시도");
    expect(useEditorStore.getState().documents["orig"].value).toBe("원본내용");
  });

  it("존재하지 않는 문서의 setValue 는 무시된다", () => {
    useEditorStore.getState().setValue("ghost", "x");
    expect(useEditorStore.getState().documents["ghost"]).toBeUndefined();
  });
});
