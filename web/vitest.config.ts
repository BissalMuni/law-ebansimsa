import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// vitest 설정 — jsdom 환경 + @/ 경로 별칭 (tsconfig paths 와 일치)
export default defineConfig({
  plugins: [react()],
  test: {
    // 현재 테스트는 모두 순수 로직·스토어라 node 로 충분(빠르고 안정적).
    // DOM 이 필요한 테스트는 파일 상단에 `// @vitest-environment jsdom` 로 개별 지정.
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
