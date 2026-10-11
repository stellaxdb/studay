"use client";

import { emailDomain, suggestDomain, withDomain } from "@/lib/email-domain";

/**
 * "혹시 name@gmail.com인가요? [바꾸기]" under an email field when the domain
 * looks like a typo of a common provider. It only suggests; it never blocks.
 */
export function EmailSuggestion({
  id,
  email,
  onApply,
}: {
  id: string;
  email: string;
  onApply: (fixed: string) => void;
}) {
  const suggestion = suggestDomain(emailDomain(email));
  return (
    <p id={id} aria-live="polite" className="text-fg-secondary text-xs empty:hidden">
      {suggestion && (
        <>
          혹시 <strong className="text-fg font-semibold">{withDomain(email, suggestion)}</strong>
          인가요?{" "}
          <button
            type="button"
            className="text-primary font-semibold underline-offset-2 hover:underline"
            onClick={() => onApply(withDomain(email, suggestion))}
          >
            바꾸기
          </button>
        </>
      )}
    </p>
  );
}
