"use client";

import { ErrorState } from "@/components/ui/states";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      className="py-24"
      message="화면을 표시하는 중에 문제가 생겼어요. 입력하던 내용이 있다면 다시 확인해 주세요."
      onRetry={reset}
    />
  );
}
