const MESSAGES: Record<string, string> = {
  ACTIVE_SESSION_EXISTS: "이미 진행 중인 공부가 있어요. 먼저 종료해 주세요.",
  SUBJECT_NOT_FOUND: "과목을 찾을 수 없어요. 보관했거나 삭제한 과목인지 확인해 주세요.",
  TODO_SUBJECT_MISMATCH: "선택한 할 일이 이 과목에 속하지 않아요.",
  SESSION_NOT_FOUND: "공부 기록을 찾을 수 없어요. 새로고침해 주세요.",
  SESSION_NOT_ACTIVE: "이미 종료된 공부예요.",
  SESSION_NOT_COMPLETED: "종료된 기록만 수정할 수 있어요.",
  SESSION_OVERLAP: "다른 공부 기록과 시간이 겹쳐요. 시간을 다시 확인해 주세요.",
  TIME_IN_FUTURE: "아직 오지 않은 시간으로는 기록할 수 없어요.",
  INVALID_TIME_RANGE: "종료 시각은 시작 시각보다 늦어야 해요.",
  SESSION_TOO_LONG: "한 번의 기록은 24시간을 넘을 수 없어요.",
  INVALID_TIMEZONE: "올바른 시간대를 선택해 주세요.",
  SUPABASE_ENV_MISSING: "Supabase 환경 변수가 설정되지 않았어요.",
};

/** Turns Supabase/network errors into calm, actionable Korean copy. */
export function toUserMessage(
  error: unknown,
  fallback = "저장하지 못했어요. 다시 시도해 주세요.",
): string {
  if (!error) return fallback;
  const e = error as { message?: string; code?: string; status?: number };
  const message = e.message ?? String(error);

  for (const [code, text] of Object.entries(MESSAGES)) {
    if (message.includes(code)) return text;
  }
  if (e.code === "23505" && message.includes("categories_subject_name_unique")) {
    return "이 과목에 같은 이름의 카테고리가 이미 있어요.";
  }
  if (e.code === "23503" || e.code === "23514") {
    return "연결된 과목이나 카테고리를 확인해 주세요.";
  }
  if (e.code === "PGRST301" || e.status === 401 || /JWT|not authenticated/i.test(message)) {
    return "로그인이 만료됐어요. 다시 로그인해 주세요.";
  }
  if (/Failed to fetch|NetworkError|network/i.test(message)) {
    return "네트워크에 연결할 수 없어요. 연결을 확인하고 다시 시도해 주세요.";
  }
  return fallback;
}

export function authErrorMessage(error: { message?: string; code?: string } | null): string {
  if (!error) return "";
  const code = error.code ?? "";
  const msg = error.message ?? "";
  if (code === "invalid_credentials" || /Invalid login credentials/i.test(msg))
    return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (code === "email_not_confirmed" || /Email not confirmed/i.test(msg))
    return "이메일 인증이 아직 완료되지 않았어요. 받은 메일의 링크를 눌러 주세요.";
  if (code === "user_already_exists" || /already registered/i.test(msg))
    return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (code === "weak_password" || /Password should be/i.test(msg))
    return "비밀번호가 너무 약해요. 8자 이상으로 영문과 숫자를 섞어 주세요.";
  if (code === "over_email_send_rate_limit" || /rate limit/i.test(msg))
    return "요청이 많아 잠시 후 다시 시도해 주세요.";
  if (code === "email_address_invalid" || /invalid.*email/i.test(msg))
    return "올바른 이메일 주소를 입력해 주세요.";
  return toUserMessage(error, "요청을 처리하지 못했어요. 다시 시도해 주세요.");
}
