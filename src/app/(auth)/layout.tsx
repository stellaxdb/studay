import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { getSupabaseEnv } from "@/lib/env";
import { SetupNotice } from "@/components/layout/setup-notice";

export default function AuthLayout({ children }: { children: ReactNode }) {
  if (!getSupabaseEnv()) return <SetupNotice />;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-center">
          <Logo height={30} />
        </div>
        {children}
      </div>
    </main>
  );
}
