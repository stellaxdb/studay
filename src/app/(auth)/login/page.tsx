import type { Metadata } from "next";
import { Suspense } from "react";
import { StartPanel } from "@/components/auth/start-panel";

export const metadata: Metadata = { title: "시작하기" };

export default function LoginPage() {
  return (
    <Suspense>
      <StartPanel />
    </Suspense>
  );
}
