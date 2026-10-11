"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { GoogleButton } from "@/components/auth/google-button";

const CALLBACK_ERRORS: Record<string, string> = {
  oauth: "Google 로그인을 완료하지 못했어요. 다시 시도해 주세요.",
  callback: "로그인을 완료하지 못했어요. 같은 브라우저에서 처음부터 다시 시도해 주세요.",
  confirm: "로그인 링크가 만료됐거나 올바르지 않아요. Google 계정으로 다시 로그인해 주세요.",
};

/** studay signs in with Google only (no passwords, emails verified by Google). */
export function LoginForm() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(
    () => CALLBACK_ERRORS[params.get("error") ?? ""] ?? null,
  );

  return (
    <>
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">로그인</h1>
      <p className="text-fg-secondary mt-1 text-sm">오늘 할 공부를 이어서 관리해 보세요.</p>
      <div className="mt-8">
        <GoogleButton next={params.get("next")} onError={setError} />
      </div>
      {error && (
        <p
          role="alert"
          className="bg-danger-subtle text-danger mt-4 rounded-[var(--radius-control)] px-3 py-2.5 text-sm"
        >
          {error}
        </p>
      )}
      <p className="text-fg-tertiary mt-3 text-xs leading-5">
        예전에 이메일로 가입했다면 같은 이메일의 Google 계정으로 로그인하면 기존 기록이 그대로
        이어져요.
      </p>
      <p className="text-fg-secondary mt-8 text-center text-sm">
        아직 계정이 없나요?{" "}
        <Link href="/signup" className="text-primary font-semibold hover:underline">
          회원가입
        </Link>
      </p>
    </>
  );
}
