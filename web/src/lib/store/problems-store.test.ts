// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { useProblemsStore } from "./problems-store";

describe("useProblemsStore", () => {
  beforeEach(() => useProblemsStore.getState().clear());

  it("setHints 로 인라인 힌트를 보관한다", () => {
    useProblemsStore.getState().setHints([
      { article_id: "a1", criterion_id: "3.3.1", source: "ebansimsa", verdict: "fail", severity: "hint" },
    ]);
    expect(useProblemsStore.getState().hints).toHaveLength(1);
  });

  it("clear 로 비운다", () => {
    useProblemsStore.getState().setHints([
      { article_id: "a1", criterion_id: "3.3.1", source: "ebansimsa", verdict: "fail", severity: "hint" },
    ]);
    useProblemsStore.getState().clear();
    expect(useProblemsStore.getState().hints).toHaveLength(0);
  });
});
