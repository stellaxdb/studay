"use client";

import Link from "next/link";
import { useState } from "react";
import { GoogleButton } from "@/components/auth/google-button";

/**
 * New accounts are created with Google only: the email is already verified
 * by Google and there is no password to manage. Existing email accounts can
 * still log in on the login page.
 */
export function SignupPanel() {
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">시작하기</h1>
      <p className="text-fg-secondary mt-1 text-sm">과목, 할 일, 공부 시간을 한곳에서 관리해요.</p>
      <div className="mt-8">
        <GoogleButton label="Google 계정으로 시작하기" onError={setError} />
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
      <p className="text-fg-secondary mt-8 text-center text-sm">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          로그인
        </Link>
      </p>
    </>
  );
}
