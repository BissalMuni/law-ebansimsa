import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "법이반심사 — 조례 입안 협업 IDE",
  description: "AI와 단계적으로 조례를 입안하는 협업 워크스페이스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 한국어 단일 (constitution §IV). 다크 모드는 .dark 클래스로 토글 (T038)
  // FOUC 방지 — 페인트 전에 저장된 테마(또는 OS 선호)를 적용
  const themeInit = `(function(){try{var t=localStorage.getItem('law-ebansimsa-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
  return (
    // suppressHydrationWarning: 위 themeInit 스크립트가 페인트 전 <html>에 .dark 를
    // 주입하므로 서버 마크업과 1단계 불일치가 정상 — React 경고만 억제한다 (next-themes 패턴)
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* 키보드 사용자용 본문 바로가기 (P5, WCAG 2.4.1) */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          본문으로 건너뛰기
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
