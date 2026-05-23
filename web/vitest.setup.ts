import "@testing-library/react";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// 각 테스트 후 DOM 정리
afterEach(() => {
  cleanup();
});
