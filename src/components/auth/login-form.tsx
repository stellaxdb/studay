"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { EmailSuggestion } from "@/components/auth/email-suggestion";
import { GoogleButton } from "@/components/auth/google-button";
import { ResendConfirmation } from "@/components/auth/resend-confirmation";
import { trackEvent } from "@/lib/analytics";
import { safeNext } from "@/lib/auth-redirect";
import { normalizeEmail, validateLogin, type LoginField } from "@/lib/auth-validation";
import { clearCache } from "@/lib/data/keys";
import { authErrorMessage } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    const code = params.get("error");
    if (code === "oauth") return "Google 로그인을 완료하지 못했어요. 다시 시도해 주세요.";
    if (code === "callback")
      return "로그인을 완료하지 못했어요. 같은 브라우저에서 처음부터 다시 시도해 주세요.";
    if (code === "confirm")
      return "인증 링크가 만료됐거나 이미 사용됐어요. 이메일과 비밀번호로 로그인하면 인증 메일을 다시 받을 수 있어요.";
    return null;
  });
  const [loading, setLoading] = useState(false);
  // New accounts use Google; email login is kept, folded away, for accounts
  // created with email before. It starts open when an email link failed.
  const [showEmail, setShowEmail] = useState(() => params.get("error") === "confirm");
  const emailRef = useRef<HTMLInputElement>(null);
  // Set when login fails because the email isn't confirmed yet.
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<LoginField, boolean>>>({});
  const [submitCount, setSubmitCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const allErrors = validateLogin({ email, password });
  const fieldError = (field: LoginField) => (touched[field] ? allErrors[field] : undefined);
  const touch = (field: LoginField) => () => setTouched((t) => ({ ...t, [field]: true }));

  useEffect(() => {
    if (submitCount === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [submitCount]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setUnconfirmed(null);
    setTouched({ email: true, password: true });
    if (Object.keys(allErrors).length > 0) {
      setSubmitCount((n) => n + 1);
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await getSupabase().auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (signInError) {
        setError(authErrorMessage(signInError));
        if (signInError.code === "email_not_confirmed") setUnconfirmed(normalizeEmail(email));
        return;
      }
      trackEvent("login", { method: "email" });
      await clearCache({ refetch: true });
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err as Error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">로그인</h1>
      <p className="text-fg-secondary mt-1 text-sm">오늘 할 공부를 이어서 관리해 보세요.</p>
      <div className="mt-8">
        <GoogleButton next={params.get("next")} onError={setError} />
      </div>
      {!showEmail && error && (
        <p
          role="alert"
          className="bg-danger-subtle text-danger mt-4 rounded-[var(--radius-control)] px-3 py-2.5 text-sm"
        >
          {error}
        </p>
      )}
      <div className="border-border mt-8 border-t pt-5">
        <button
          type="button"
          aria-expanded={showEmail}
          aria-controls="email-login"
          onClick={() => {
            const next = !showEmail;
            setShowEmail(next);
            if (next) requestAnimationFrame(() => emailRef.current?.focus());
          }}
          className="text-fg-secondary hover:text-fg flex min-h-10 w-full items-center justify-between rounded-md text-left text-sm font-medium"
        >
          이메일로 가입한 기존 계정으로 로그인
          <ChevronDown
            aria-hidden
            className={`size-4 transition-transform duration-150 motion-reduce:transition-none ${showEmail ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {showEmail && (
        <form
          id="email-login"
          ref={formRef}
          onSubmit={onSubmit}
          noValidate
          className="mt-4 flex flex-col gap-4"
        >
          <Field label="이메일" error={fieldError("email")}>
            {({ id, describedBy, invalid }) => (
              <>
                <Input
                  ref={emailRef}
                  id={id}
                  aria-describedby={[describedBy, `${id}-suggestion`].filter(Boolean).join(" ")}
                  aria-invalid={invalid}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={touch("email")}
                  required
                />
                {touched.email && (
                  <EmailSuggestion id={`${id}-suggestion`} email={email} onApply={setEmail} />
                )}
              </>
            )}
          </Field>
          <Field label="비밀번호" error={fieldError("password")}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={touch("password")}
                required
              />
            )}
          </Field>
          {error && (
            <p
              role="alert"
              className="bg-danger-subtle text-danger rounded-[var(--radius-control)] px-3 py-2.5 text-sm"
            >
              {error}
            </p>
          )}
          {unconfirmed && <ResendConfirmation email={unconfirmed} next={params.get("next")} />}
          <Button type="submit" loading={loading} className="mt-2 h-11">
            이메일로 로그인
          </Button>
        </form>
      )}
      <p className="text-fg-secondary mt-6 text-center text-sm">
        아직 계정이 없나요?{" "}
        <Link href="/signup" className="text-primary font-semibold hover:underline">
          회원가입
        </Link>
      </p>
    </>
  );
}
