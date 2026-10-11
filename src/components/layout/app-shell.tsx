"use client";

import { Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { cacheNeedsRefetch, clearCache } from "@/lib/data/keys";
import { getSupabaseEnv } from "@/lib/env";
import { getSupabase } from "@/lib/supabase/client";
import { SidebarContent } from "./sidebar";
import { SetupNotice } from "./setup-notice";

function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const ready = user !== null;
  const email = user?.email ?? null;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      if (!data.user) {
        await clearCache({ refetch: false });
        router.replace("/login");
        return;
      }
      const next = { id: data.user.id, email: data.user.email ?? null };
      // Never show one account's cached data to another account.
      if (lastUserId.current !== next.id || cacheNeedsRefetch()) {
        await clearCache({ refetch: true });
      }
      lastUserId.current = next.id;
      if (active) setUser(next);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        void clearCache({ refetch: false });
        router.replace("/login");
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const el = drawerRef.current;
    if (!el) return;
    if (drawerOpen && !el.open) el.showModal();
    if (!drawerOpen && el.open) el.close();
  }, [drawerOpen]);

  async function signOut() {
    const { error } = await getSupabase().auth.signOut();
    if (error) {
      toast.error("로그아웃하지 못했어요. 다시 시도해 주세요.");
      return;
    }
    setUser(null);
    await clearCache({ refetch: false });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh md:pl-[232px]">
      <a
        href="#main"
        className="bg-surface sr-only z-50 rounded-md px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        본문으로 건너뛰기
      </a>

      {/* Desktop sidebar */}
      <aside className="border-border bg-background fixed inset-y-0 left-0 hidden w-[232px] border-r md:block">
        <SidebarContent email={email} onSignOut={signOut} showTimer={ready} />
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="border-border bg-background/95 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur-sm md:hidden">
        <Logo height={26} />
        <Button
          variant="tertiary"
          size="icon"
          aria-label="메뉴 열기"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <Menu aria-hidden className="size-5" />
        </Button>
      </header>
      <dialog
        ref={drawerRef}
        aria-label="메뉴"
        onCancel={(e) => {
          e.preventDefault();
          setDrawerOpen(false);
        }}
        onClick={(e) => e.target === e.currentTarget && setDrawerOpen(false)}
        className="border-border bg-background m-0 h-dvh max-h-dvh w-[264px] max-w-[85vw] border-r p-0"
      >
        {drawerOpen && (
          <div className="relative h-full">
            <Button
              variant="tertiary"
              size="icon-sm"
              aria-label="메뉴 닫기"
              className="absolute top-4 right-3"
              onClick={() => setDrawerOpen(false)}
            >
              <X aria-hidden className="size-4" />
            </Button>
            <SidebarContent
              email={email}
              onSignOut={signOut}
              showTimer={ready}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        )}
      </dialog>

      <main id="main" className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Keyed by user: page state (filters, selections) never leaks across accounts. */}
        {user ? <Fragment key={user.id}>{children}</Fragment> : <LoadingState className="py-24" />}
      </main>
    </div>
  );
}

const noopSubscribe = () => () => {};

/**
 * Personal pages depend on the signed-in user and the current time, so they
 * are rendered only in the browser. The prerendered shell is a loading state.
 */
function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const isClient = useIsClient();
  if (!getSupabaseEnv()) return <SetupNotice />;
  if (!isClient) return <LoadingState className="py-24" />;
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        errorRetryCount: 2,
        dedupingInterval: 2000,
      }}
    >
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </SWRConfig>
  );
}
