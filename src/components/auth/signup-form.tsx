"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { trackEvent } from "@/lib/analytics";
import { authCallbackUrl } from "@/lib/auth-redirect";
import { clearCache } from "@/lib/data/keys";
import { authErrorMessage } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/client";

interface Errors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
  form?: string;
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function validate(): Errors {
    const next: Errors = {};
    if (name.trim().length > 30) next.name = "이름은 30자 이내로 입력해 주세요.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "올바른 이메일 주소를 입력해 주세요.";
    if (password.length < 8) next.password = "비밀번호는 8자 이상이어야 해요.";
    if (confirm !== password) next.confirm = "비밀번호가 서로 달라요.";
    return next;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setLoading(true);
    try {
      const { data, error } = await getSupabase().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: name.trim() || null },
          emailRedirectTo: authCallbackUrl(window.location.origin, "/"),
        },
      });
      if (error) {
        setErrors({ form: authErrorMessage(error) });
        return;
      }
      if (data.session) {
        // Email confirmation is disabled in this Supabase project. With it on,
        // sign_up is reported when the confirmation link is opened instead.
        trackEvent("sign_up", { method: "email" });
        await clearCache({ refetch: true });
        router.replace("/");
        router.refresh();
        return;
      }
      setSentTo(email.trim());
    } catch (err) {
      setErrors({ form: authErrorMessage(err as Error) });
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <div>
        <span className="bg-primary-subtle text-primary flex size-10 items-center justify-center rounded-full">
          <MailCheck aria-hidden className="size-5" />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">메일을 확인해 주세요</h1>
        <p className="text-fg-secondary mt-2 text-sm leading-6">
          <strong className="text-fg font-semibold">{sentTo}</strong>로 인증 메일을 보냈어요. 메일의
          링크를 누르면 가입이 완료되고 바로 시작할 수 있어요.
        </p>
        <p className="text-fg-secondary mt-6 text-sm">
          메일이 오지 않았나요? 스팸함을 확인하거나{" "}
          <button
            type="button"
            className="text-primary font-semibold hover:underline"
            onClick={() => setSentTo(null)}
          >
            다시 가입
          </button>
          해 주세요.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">회원가입</h1>
      <p className="text-fg-secondary mt-1 text-sm">과목, 할 일, 공부 시간을 한곳에서 관리해요.</p>
      <div className="mt-8">
        <GoogleButton onError={(message) => setErrors({ form: message })} />
      </div>
      <AuthDivider />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="이름" optional error={errors.name} hint="홈 화면 인사에 사용돼요.">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              autoComplete="nickname"
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <Field label="이메일" error={errors.email}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Field label="비밀번호" error={errors.password} hint="8자 이상">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <Field label="비밀번호 확인" error={errors.confirm}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          )}
        </Field>
        {errors.form && (
          <p
            role="alert"
            className="bg-danger-subtle text-danger rounded-[var(--radius-control)] px-3 py-2.5 text-sm"
          >
            {errors.form}
          </p>
        )}
        <Button type="submit" loading={loading} className="mt-2 h-11">
          가입하기
        </Button>
      </form>
      <p className="text-fg-secondary mt-6 text-center text-sm">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          로그인
        </Link>
      </p>
    </>
  );
}
