// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "./debounce";

// 500ms idle 자동저장의 핵심 — 디바운스 (ui-spec §7.6)
describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("지정 시간 동안 추가 호출이 없으면 한 번만 실행한다", () => {
    const fn = vi.fn();
    const d = debounce(fn, 500);
    d();
    d();
    d();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("호출이 이어지면 마지막 호출 기준으로 지연된다 (idle 재설정)", () => {
    const fn = vi.fn();
    const d = debounce(fn, 500);
    d();
    vi.advanceTimersByTime(300);
    d(); // 타이머 리셋
    vi.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled(); // 아직 idle 500ms 미달
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("마지막 호출의 인자로 실행된다", () => {
    const fn = vi.fn();
    const d = debounce(fn, 500);
    d("a");
    d("b");
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledWith("b");
  });

  it("cancel 하면 예약된 실행이 취소된다", () => {
    const fn = vi.fn();
    const d = debounce(fn, 500);
    d();
    d.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
  });
});
