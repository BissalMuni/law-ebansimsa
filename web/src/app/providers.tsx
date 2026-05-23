"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// TanStack Query 프로바이더 — api/ 응답 등 서버 상태 캐시 (plan §2, constitution §II)
// QueryClient 를 컴포넌트 상태로 보관해 RSC 재마운트 시에도 단일 인스턴스 유지
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1분
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
