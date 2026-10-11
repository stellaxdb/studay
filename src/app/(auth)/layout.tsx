import type { ReactNode } from "react";
import { getSupabaseEnv } from "@/lib/env";
import { SetupNotice } from "@/components/layout/setup-notice";

export default function AuthLayout({ children }: { children: ReactNode }) {
  if (!getSupabaseEnv()) return <SetupNotice />;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-center gap-2">
          <span
            aria-hidden
            className="bg-primary flex size-8 items-center justify-center rounded-lg text-base font-bold text-white"
          >
            s
          </span>
          <span className="text-xl font-bold tracking-tight">studay</span>
        </div>
        {children}
      </div>
    </main>
  );
}
