"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { authCallbackUrl } from "@/lib/auth-redirect";
import { authErrorMessage } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/client";

/** Seconds to wait between resends (Supabase also rate-limits on its side). */
const COOLDOWN_SECONDS = 60;

/**
 * "인증 메일 다시 보내기" for an account whose email isn't confirmed yet.
 * Used on the "메일을 확인해 주세요" screen and when login fails with
 * email_not_confirmed.
 */
export function ResendConfirmation({
  email,
  next,
  initialCooldown = 0,
}: {
  email: string;
  next?: string | null;
  /** Start counting down right away (e.g. a mail was just sent by sign-up). */
  initialCooldown?: number;
}) {
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ kind: "sent" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    setSending(true);
    setStatus(null);
    try {
      const { error } = await getSupabase().auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: authCallbackUrl(window.location.origin, next) },
      });
      if (error) {
        setStatus({ kind: "error", text: authErrorMessage(error) });
        if (error.code === "over_email_send_rate_limit") setCooldown(COOLDOWN_SECONDS);
        return;
      }
      setStatus({
        kind: "sent",
        text: "인증 메일을 다시 보냈어요. 메일함과 스팸함을 확인해 주세요.",
      });
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      setStatus({ kind: "error", text: authErrorMessage(err as Error) });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="secondary"
        size="sm"
        loading={sending}
        disabled={cooldown > 0}
        onClick={resend}
      >
        {cooldown > 0 ? `인증 메일 다시 보내기 (${cooldown}초 후)` : "인증 메일 다시 보내기"}
      </Button>
      <p
        role="status"
        className={
          status?.kind === "error" ? "text-danger text-xs font-medium" : "text-fg-secondary text-xs"
        }
      >
        {status?.text ??
          (cooldown > 0 ? "메일이 연달아 가지 않도록 잠시 후에 다시 보낼 수 있어요." : "")}
      </p>
    </div>
  );
}
