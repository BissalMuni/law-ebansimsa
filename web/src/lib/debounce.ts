// 디바운스 — 마지막 호출 후 idle 시간이 지나면 1회 실행 (ui-spec §7.6 자동저장)
export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel: () => void;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return debounced;
}
