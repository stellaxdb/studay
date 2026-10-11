# studay

대학생을 위한 개인 학습 플래너입니다. 과목별 할 일, 공부 타이머, 캘린더, 학습 통계를 한곳에서 관리합니다.

- **할 일**: 과목·카테고리별 TODO, 우선순위, 마감일, 예상 소요 시간, 완료/완료 취소
- **공부 타이머**: 과목(선택적으로 할 일)에 연결해 시작·일시정지·재개·종료. 새로고침하거나 탭을 닫아도 시간이 정확하게 이어집니다
- **캘린더**: TODO 마감일과 시험·수업 같은 일정을 월간 보기로 함께 확인
- **대시보드·학습 분석**: 오늘 할 일, 오늘/이번 주 공부 시간과 목표, 과목별 진행률, 7일·4주 추이

기술 스택: Next.js 16 (App Router, React 19, TypeScript) · Tailwind CSS 4 · Supabase (Auth, PostgreSQL, RLS) · Vercel

요구사항 문서는 [`docs/`](docs), 개발 규칙은 [`AGENTS.md`](AGENTS.md), 브랜치·커밋 규칙은 [`CONTRIBUTING.md`](CONTRIBUTING.md)에 있습니다.

---

## 1. 로컬에서 실행하기

필요한 것: Node.js 20.9 이상(22 권장), Supabase 프로젝트(아래 2번)

```bash
git clone https://github.com/stellaxdb/studay.git
cd studay
npm install
cp .env.example .env.local   # 값 채우기 (아래 3번)
npm run dev                  # http://localhost:3000
```

Supabase 환경 변수가 없으면 앱은 오류 대신 "Supabase 연결이 필요해요" 안내 화면을 보여줍니다.

## 2. Supabase 프로젝트 만들기와 DB 적용

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다. 리전은 사용자와 가까운 곳(예: Northeast Asia (Seoul))을 고릅니다.
2. DB 스키마를 적용합니다. 둘 중 하나를 선택하세요.
   - **가장 쉬운 방법 (SQL Editor)**: 대시보드 > SQL Editor > New query에 [`supabase/migrations/20261011000000_init.sql`](supabase/migrations/20261011000000_init.sql) 전체를 붙여넣고 **Run**.
   - **Supabase CLI**: `npx supabase login` → `npx supabase link --project-ref <프로젝트-ref>` → `npx supabase db push`
3. Table Editor에서 `subjects`, `todos`, `study_sessions` 등 7개 테이블이 생기고 모두 **RLS enabled**로 표시되는지 확인합니다.

이후 DB를 바꿀 때는 기존 파일을 고치지 말고 `supabase/migrations/`에 새 SQL 파일을 추가합니다.

## 3. 환경 변수

| 변수                                   | 공개 여부 | 설명                                                                                                            |
| -------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | 공개 가능 | Supabase 프로젝트 URL                                                                                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 가능 | publishable key(`sb_publishable_…`). 예전 프로젝트는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 anon key를 넣어도 됩니다 |

두 값은 대시보드의 **Connect** 버튼 또는 Project Settings > API Keys에서 복사합니다.

- 이 앱은 **service_role / secret key를 사용하지 않습니다.** 어떤 비밀 키도 `NEXT_PUBLIC_` 접두사로 등록하지 마세요.
- 데이터 보호는 키를 숨기는 방식이 아니라 DB의 RLS 정책(본인 행만 접근)으로 이뤄집니다.
- `.env.local`은 `.gitignore`에 포함되어 있어 커밋되지 않습니다.

## 4. Supabase 인증(Auth) 설정

대시보드 > Authentication > **URL Configuration**에서:

| 항목          | 로컬 개발                             | 배포 후                                        |
| ------------- | ------------------------------------- | ---------------------------------------------- |
| Site URL      | `http://localhost:3000`               | `https://<내-도메인>.vercel.app`               |
| Redirect URLs | `http://localhost:3000/auth/callback` | `https://<내-도메인>.vercel.app/auth/callback` |

- Redirect URLs에는 로컬·프로덕션 주소를 **둘 다** 추가해 두면 편합니다. Vercel Preview 배포까지 쓰려면 `https://*-<vercel-계정>.vercel.app/auth/callback` 같은 와일드카드를 추가할 수 있습니다.
- 회원가입하면 인증 메일의 링크가 `/auth/callback`으로 돌아와 로그인이 완료됩니다.
- Supabase 기본 메일 서버는 발송량이 적게 제한된 테스트용입니다. 혼자 쓰거나 테스트할 때는 Authentication > Sign In / Providers > Email에서 **Confirm email**을 끄면 가입 즉시 로그인됩니다. 다른 사람이 쓰게 하려면 Custom SMTP 설정을 권장합니다.

## 5. GitHub와 Vercel 배포

1. 코드는 GitHub `stellaxdb/studay`에 있습니다. `main` 브랜치가 프로덕션 배포 대상입니다.
2. [vercel.com/new](https://vercel.com/new)에서 GitHub 저장소 `studay`를 **Import** 합니다. Framework Preset은 Next.js로 자동 인식되고, 빌드 명령(`npm run build`)과 출력 설정은 기본값 그대로 둡니다.
3. **Environment Variables**에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 Production·Preview 모두에 등록합니다.
4. **Deploy** → 발급된 주소(`https://….vercel.app`)를 4번의 Site URL·Redirect URLs에 추가합니다.
5. 배포 주소에서 확인합니다: 회원가입/로그인 → 과목·할 일 추가 → 타이머 시작·새로고침·종료 → 캘린더·대시보드 반영 → 다른 계정으로 로그인했을 때 데이터가 보이지 않는지.
6. 이후에는 작업 브랜치를 push해 PR을 열면 Vercel이 **Preview 배포**를 만들고 GitHub Actions(CI)가 검사를 실행합니다. `main`에 병합하면 프로덕션에 자동 배포됩니다.

> `NEXT_PUBLIC_` 변수는 빌드 시점에 코드에 들어갑니다. 값을 바꾼 뒤에는 Vercel에서 **Redeploy** 해야 반영됩니다.

## 6. 무료 플랜 사용 시 주의

조건은 바뀔 수 있으니 사용 전에 각 서비스의 최신 안내를 확인하세요. (2026-10 확인 기준)

- **Supabase Free**: 7일 동안 DB 활동이 거의 없으면 프로젝트가 **일시정지**됩니다. 대시보드에서 Resume project로 데이터 그대로 복구할 수 있고, 일시정지 후 최대 1년까지 복구 가능합니다. 자세한 내용: [Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing). DB 용량·프로젝트 수 한도는 [Supabase Pricing](https://supabase.com/pricing)을 확인하세요.
- **Vercel Hobby**: 무료이지만 **개인·비상업적 용도로만** 사용할 수 있습니다. 함수 호출·전송량 등 월 사용량 한도가 있고, 초과하면 해당 기능을 30일 뒤에 다시 쓸 수 있는 경우가 많습니다. 자세한 내용: [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby).
- 이 앱은 타이머를 위해 서버를 상시 실행하지 않습니다. 타이머 상태는 시작·일시정지·재개·종료 시점에만 DB에 저장되고, 화면의 시계는 저장된 시각으로 계산합니다.

## 7. 검사와 테스트

```bash
npm run check     # 타입 검사 + ESLint + Prettier + 단위 테스트(Vitest)
npm run build     # 프로덕션 빌드
npm run test:db   # DB 통합 테스트 (일회용 PostgreSQL 필요)
```

`npm run test:db`는 `TEST_DATABASE_URL`(기본 `postgres://postgres:postgres@localhost:5432/postgres`)에 임시 DB를 만들어 Supabase 인증 동작을 흉내 낸 뒤, 마이그레이션을 적용하고 두 사용자로 RLS·타이머 함수를 검사한 후 임시 DB를 삭제합니다. **실서비스 DB 주소를 넣지 마세요.** GitHub Actions에서는 PostgreSQL 컨테이너로 자동 실행됩니다.

| 검사             | 내용                                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 단위 테스트 25개 | 시간대·자정 분할·서머타임, 타이머 경과 시간, TODO 정렬·필터·진행률, 공부 시간 집계, 일정 날짜                                                            |
| DB 테스트 26개   | 사용자 간 데이터 격리, 비로그인 차단, TODO-카테고리 과목 일치, 타이머 동시 시작 시 1개만 생성, 중복 종료 시 1회만 집계, 겹치는 시간 수정 거부, 삭제 정책 |

## 8. 데이터 설계 요약

- 테이블: `user_settings`, `subjects`, `categories`, `todos`, `calendar_events`, `study_sessions`, `study_segments` — 모두 RLS로 본인 데이터만 접근
- **공부 시간은 `study_segments`(중단 없이 공부한 구간)에서만 계산**합니다. 일시정지할 때마다 구간이 닫히고 재개하면 새 구간이 열립니다. 전체·과목별·일별 시간은 모두 같은 구간 데이터에서 집계하므로 중복 계산이 없습니다.
- 사용자당 진행 중 세션은 DB 유니크 인덱스로 1개만 허용되고, 타이머 조작은 DB 함수로만 할 수 있습니다(클라이언트가 시간을 직접 쓸 수 없음).
- "오늘"·"이번 주"는 설정의 시간대(기본 Asia/Seoul) 기준이며, 자정을 넘긴 공부는 날짜별로 나눠 집계합니다.
- 과목 **삭제** 시 카테고리·할 일·공부 기록이 함께 삭제되고 일정은 남되 과목 연결만 해제됩니다. 기록을 남기려면 **보관**을 사용하세요. 카테고리 삭제 시 할 일은 미분류 또는 선택한 카테고리로 옮겨집니다.

## 9. 알려진 제한

- 캘린더는 월간 보기만 제공합니다(주간·일간 보기, 반복 일정, 외부 캘린더 연동 없음).
- 여러 날에 걸친 일정은 표시는 되지만, 일정 입력 폼은 하루 안의 시작·종료 시각만 지원합니다.
- 공부 기록 시간을 수정하면 그 기록의 일시정지 구간이 하나로 합쳐집니다.
- 오프라인 상태에서 타이머 조작은 저장되지 않으며, 실패 시 오류와 다시 시도 버튼을 보여줍니다.
- 비밀번호 재설정, 소셜 로그인은 아직 없습니다.
