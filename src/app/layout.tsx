import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "studay", template: "%s · studay" },
  description: "과목별 할 일, 공부 타이머, 캘린더를 한곳에서 관리하는 대학생 학습 플래너",
};

export const viewport: Viewport = {
  themeColor: "#f7f8fa",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
