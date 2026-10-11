"use client";

import { Check, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { EmailSuggestion } from "@/components/auth/email-suggestion";
import { AuthDivider, GoogleButton } from "@/components/auth/google-button";
import { trackEvent } from "@/lib/analytics";
import {
  NAME_MAX,
  normalizeEmail,
  passwordChecks,
  validateSignup,
  type SignupErrors,
  type SignupField,
} from "@/lib/auth-validation";
import { authCallbackUrl } from "@/lib/auth-redirect";
import { clearCache } from "@/lib/data/keys";
import { emailDomain, type Deliverability } from "@/lib/email-domain";
import { checkEmailDomain } from "@/lib/email-domain-client";
import { authErrorMessage } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/client";

type Errors = SignupErrors & { form?: string };

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  // A field shows its error once the user has left it (or tried to submit),
  // then updates live while they fix it.
  const [touched, setTouched] = useState<Partial<Record<SignupField, boolean>>>({});
  const [submitCount, setSubmitCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Whether each email domain can receive mail (checked on the server via DNS).
  const [domainStatus, setDomainStatus] = useState<Record<string, Deliverability | "checking">>({});

  const allErrors = validateSignup({ name, email, password, confirm });
  const domain = emailDomain(email);
  if (!allErrors.email && domainStatus[domain] === false) {
    allErrors.email = `${domain}은(는) 메일을 받을 수 없는 도메인이에요. 주소를 확인해 주세요.`;
  }
  const errors: Errors = { form: formError ?? undefined };
  for (const field of Object.keys(allErrors) as SignupField[]) {
    if (touched[field]) errors[field] = allErrors[field];
  }
  const touch = (field: SignupField) => () => setTouched((t) => ({ ...t, [field]: true }));

  async function checkDomain(target: string): Promise<Deliverability> {
    const known = domainStatus[target];
    if (known === true || known === false) return known;
    setDomainStatus((s) => ({ ...s, [target]: "checking" }));
    const result = await checkEmailDomain(target);
    setDomainStatus((s) => ({ ...s, [target]: result }));
    return result;
  }

  function onEmailBlur() {
    touch("email")();
    if (!validateSignup({ name, email, password, confirm }).email) void checkDomain(domain);
  }

  // After a failed submit, move focus to the first field that needs fixing.
  useEffect(() => {
    if (submitCount === 0) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [submitCount]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (Object.keys(allErrors).length > 0) {
      setSubmitCount((n) => n + 1);
      return;
    }
    setLoading(true);
    try {
      // Unknown (DNS failed or slow) lets sign-up continue; only a definite "no" blocks.
      if ((await checkDomain(domain)) === false) {
        setSubmitCount((n) => n + 1);
        return;
      }
      const { data, error } = await getSupabase().auth.signUp({
        email: normalizeEmail(email),
        password,
        options: {
          data: { display_name: name.trim() || null },
          emailRedirectTo: authCallbackUrl(window.location.origin, "/"),
        },
      });
      if (error) {
        setFormError(authErrorMessage(error));
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
      setSentTo(normalizeEmail(email));
    } catch (err) {
      setFormError(authErrorMessage(err as Error));
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
        <GoogleButton onError={setFormError} />
      </div>
      <AuthDivider />
      <form ref={formRef} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="이름" optional error={errors.name} hint="홈 화면 인사에 사용돼요.">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              autoComplete="nickname"
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              onBlur={touch("name")}
            />
          )}
        </Field>
        <Field
          label="이메일"
          error={errors.email}
          hint={
            domainStatus[domain] === "checking"
              ? "메일을 받을 수 있는 주소인지 확인하고 있어요."
              : undefined
          }
        >
          {({ id, describedBy, invalid }) => (
            <>
              <Input
                id={id}
                aria-describedby={[describedBy, `${id}-suggestion`].filter(Boolean).join(" ")}
                aria-invalid={invalid}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={onEmailBlur}
              />
              {touched.email && (
                <EmailSuggestion
                  id={`${id}-suggestion`}
                  email={email}
                  onApply={(fixed) => {
                    setEmail(fixed);
                    void checkDomain(emailDomain(fixed));
                  }}
                />
              )}
            </>
          )}
        </Field>
        <Field label="비밀번호" error={errors.password}>
          {({ id, describedBy, invalid }) => (
            <>
              <Input
                id={id}
                aria-describedby={[`${id}-rules`, describedBy].filter(Boolean).join(" ")}
                aria-invalid={invalid}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={touch("password")}
              />
              <PasswordRules id={`${id}-rules`} password={password} />
            </>
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
              onBlur={touch("confirm")}
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

/** Live password requirements; met items get a check mark and "충족" text, not just color. */
function PasswordRules({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="비밀번호 조건">
      {passwordChecks(password).map((check) => (
        <li
          key={check.key}
          className={
            check.met
              ? "text-success flex items-center gap-1"
              : "text-fg-tertiary flex items-center gap-1"
          }
        >
          {check.met ? (
            <Check aria-hidden className="size-3.5" />
          ) : (
            <span aria-hidden className="inline-block size-3.5 text-center leading-3.5">
              ·
            </span>
          )}
          {check.label}
          <span className="sr-only">{check.met ? " 충족" : " 미충족"}</span>
        </li>
      ))}
    </ul>
  );
}
