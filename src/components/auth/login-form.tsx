"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { safeNext } from "@/lib/auth-redirect";
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
      return "인증 링크가 만료되었거나 올바르지 않아요. 다시 로그인하거나 가입해 주세요.";
    return null;
  });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const { error: signInError } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(authErrorMessage(signInError));
        return;
      }
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
      <h1 className="text-2xl font-bold tracking-tight">로그인</h1>
      <p className="text-fg-secondary mt-1 text-sm">오늘 할 공부를 이어서 관리해 보세요.</p>
      <div className="mt-8">
        <GoogleButton next={params.get("next")} onError={setError} />
      </div>
      <AuthDivider />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="이메일">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
        </Field>
        <Field label="비밀번호">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
        <Button type="submit" loading={loading} className="mt-2 h-11">
          로그인
        </Button>
      </form>
      <p className="text-fg-secondary mt-6 text-center text-sm">
        아직 계정이 없나요?{" "}
        <Link href="/signup" className="text-primary font-semibold hover:underline">
          회원가입
        </Link>
      </p>
    </>
  );
}
