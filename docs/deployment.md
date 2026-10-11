# studay 배포 가이드

처음부터 직접 배포하거나, Supabase 프로젝트를 새로 만들거나, 인증 설정을 바꿀 때 보는 문서입니다. 운영 중인 서비스: [studay-three.vercel.app](https://studay-three.vercel.app/)

순서: **1. Supabase DB → 2. 인증 설정 → 3. Vercel → 4. Google 로그인(선택)**

## 환경 변수

| 변수                                   | 설명                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase 프로젝트 URL                                                                                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개용 키(`sb_publishable_…`). 예전 프로젝트는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 anon key를 넣어도 됩니다 |

두 값 모두 브라우저에 공개되도록 설계된 값이며 데이터 보호는 RLS가 담당합니다. 이 앱은 service_role·secret key를 쓰지 않으니 어떤 비밀 키도 `NEXT_PUBLIC_` 변수로 등록하지 마세요. 값은 Supabase 대시보드의 **Connect** 버튼(App Frameworks > Next.js)에서 복사할 수 있습니다.

## 1. Supabase 프로젝트와 DB

1. [supabase.com](https://supabase.com)에서 프로젝트를 만듭니다(리전 예: Northeast Asia (Seoul)).
2. **SQL Editor > New query**에 [`supabase/migrations/`](../supabase/migrations)의 파일을 **이름 순서대로** 하나씩 붙여넣고 Run 합니다.
   1. `20261011000000_init.sql` — 테이블, RLS, 타이머 함수
   2. `20261011160000_social_login_display_name.sql` — Google 가입자 이름 자동 설정
   3. `20261011170000_subject_sort_order.sql` — 과목 순서 변경
   - Supabase CLI를 쓴다면: `npx supabase link --project-ref <ref>` 후 `npx supabase db push`
3. **Table Editor**에 7개 테이블(`user_settings`, `subjects`, `categories`, `todos`, `calendar_events`, `study_sessions`, `study_segments`)이 생겼는지 확인합니다. 빨간 **Unrestricted** 표시가 없어야 RLS가 켜진 상태입니다.

DB를 바꿀 때는 기존 파일을 수정하지 말고 새 마이그레이션 파일을 추가합니다.

## 2. 인증 설정

**Authentication > URL Configuration**

| 항목          | 값                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------- |
| Site URL      | `https://<내-도메인>.vercel.app`                                                                    |
| Redirect URLs | `https://<내-도메인>.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`(로컬 개발 시) |

Vercel Preview 배포에서도 로그인하려면 `https://*-<vercel-계정>.vercel.app/auth/callback` 같은 와일드카드를 추가합니다.

**이메일 인증**: Supabase 기본 메일 서버는 발송량이 적은 테스트용입니다. 혼자 쓰거나 테스트할 때는 **Sign In / Providers > Email**에서 **Confirm email**을 끄면 가입 즉시 로그인됩니다. 여러 사람이 쓰게 하려면 Custom SMTP를 설정하세요.

## 3. Vercel

1. [vercel.com/new](https://vercel.com/new)에서 GitHub 저장소 `studay`를 Import 합니다. 프레임워크는 Next.js로 자동 인식되며 빌드 설정은 기본값 그대로 둡니다.
2. Environment Variables에 위 두 환경 변수를 등록합니다(Production·Preview·Development 모두).
3. Deploy 후 받은 주소를 2단계의 Site URL·Redirect URLs에 넣습니다.

`main`에 병합하면 프로덕션에, 작업 브랜치를 push하면 Preview로 자동 배포됩니다. `NEXT_PUBLIC_` 값을 바꾼 뒤에는 **Redeploy**해야 반영됩니다.

## 4. Google 로그인 (선택)

1. Supabase **Authentication > Sign In / Providers > Google**에서 **Callback URL**(`https://<ref>.supabase.co/auth/v1/callback`)을 복사합니다.
2. [Google Cloud Console](https://console.cloud.google.com) > **Google Auth Platform**
   - **Branding**: 앱 이름, 지원 이메일
   - **Audience**: External. 게시 전(Testing)에는 **Test users**에 추가한 계정만 로그인할 수 있습니다.
   - **Data Access**: `openid` 범위 추가
   - **Clients > Create client > Web application**
     - Authorized JavaScript origins: `https://<내-도메인>.vercel.app` (로컬 개발 시 `http://localhost:3000` 추가)
     - Authorized redirect URIs: 1번의 **Supabase Callback URL** (앱의 `/auth/callback`이 아님)
3. 발급된 Client ID·Client Secret을 Supabase Google 화면에 넣고 Enable 합니다.
4. 2단계의 Redirect URLs에 `https://<내-도메인>.vercel.app/auth/callback`이 있는지 확인합니다. Google 로그인에는 필수입니다.

같은 이메일로 이미 가입한 계정은 같은 사용자로 연결되고, Google 가입자의 이름은 Google 프로필 이름으로 자동 설정됩니다. Google 브랜딩 가이드는 공식 "G" 로고 사용을 권장하므로, 필요하면 [공식 리소스](https://developers.google.com/identity/branding-guidelines)를 받아 `src/components/auth/google-button.tsx`에 넣으세요.

## 무료 플랜 참고 (2026-10 확인)

- **Supabase Free**: 7일 동안 활동이 거의 없으면 프로젝트가 일시정지됩니다. 대시보드의 Resume project로 데이터 그대로 복구할 수 있습니다(일시정지 후 최대 1년). — [Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- **Vercel Hobby**: 개인·비상업적 용도로만 쓸 수 있고 월 사용량 한도가 있습니다. — [Hobby Plan](https://vercel.com/docs/plans/hobby)

조건은 바뀔 수 있으니 사용 전에 최신 안내를 확인하세요.
