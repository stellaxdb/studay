export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold">Supabase 연결이 필요해요</h1>
      <p className="text-fg-secondary mt-3 text-sm leading-6">
        <code className="bg-surface-subtle rounded px-1">NEXT_PUBLIC_SUPABASE_URL</code>과{" "}
        <code className="bg-surface-subtle rounded px-1">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
        를 설정한 뒤 서버를 다시 시작해 주세요. 로컬에서는 <code>.env.local</code>, 배포 환경에서는
        Vercel 프로젝트의 Environment Variables에 등록합니다. 자세한 방법은 README의 &ldquo;Supabase
        설정&rdquo;을 확인해 주세요.
      </p>
    </main>
  );
}
