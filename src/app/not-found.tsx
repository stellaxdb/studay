import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="tabular text-primary text-sm font-semibold">404</p>
      <h1 className="mt-2 text-2xl font-bold">페이지를 찾을 수 없어요</h1>
      <p className="text-fg-secondary mt-2 text-sm">주소가 바뀌었거나 삭제된 페이지예요.</p>
      <Link href="/" className={buttonClasses("primary", "md", "mt-6")}>
        홈으로 가기
      </Link>
    </main>
  );
}
