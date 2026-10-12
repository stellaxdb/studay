"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { GoogleButton } from "@/components/auth/google-button";

const CALLBACK_ERRORS: Record<string, string> = {
  oauth: "Google 로그인을 완료하지 못했어요. 다시 시도해 주세요.",
  callback: "로그인을 완료하지 못했어요. 같은 브라우저에서 처음부터 다시 시도해 주세요.",
  confirm: "로그인 링크가 만료됐거나 올바르지 않아요. 다시 시도해 주세요.",
};

/**
 * The only sign-in screen. Google sign-in creates the account on the first
 * visit and logs in afterwards, so sign-up and login are the same step.
 */
export function StartPanel() {
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(
    () => CALLBACK_ERRORS[params.get("error") ?? ""] ?? null,
  );

  return (
    <>
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">시작하기</h1>
      <p className="text-fg-secondary mt-1 text-sm">과목, 할 일, 공부 시간을 한곳에서 관리해요.</p>
      <div className="mt-8">
        <GoogleButton
          label="Google 계정으로 시작하기"
          next={params.get("next")}
          onError={setError}
        />
      </div>
      <p className="text-fg-tertiary mt-3 text-xs leading-5">
        Google 계정으로 별도의 회원가입 없이 로그인할 수 있어요.
      </p>
      {error && (
        <p
          role="alert"
          className="bg-danger-subtle text-danger mt-4 rounded-[var(--radius-control)] px-3 py-2.5 text-sm"
        >
          {error}
        </p>
      )}
    </>
  );
}
