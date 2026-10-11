# studay 작업 규칙

혼자 작업하더라도 아래 규칙을 지키면 변경 이력을 추적하기 쉽고, `main`이 항상 배포 가능한 상태로 유지됩니다.

## 0. 시작하기

필요한 것: Node.js 20.9 이상(22 권장), Supabase 프로젝트([배포 가이드](docs/deployment.md) 1단계)

```bash
git clone https://github.com/stellaxdb/studay.git
cd studay
npm install                  # 커밋 훅(husky)도 함께 설치됩니다
cp .env.example .env.local   # Supabase URL과 publishable key 입력
npm run dev                  # http://localhost:3000
```

- 환경 변수 설명은 [배포 가이드 › 환경 변수](docs/deployment.md#환경-변수)를 참고하세요. `.env.local`은 커밋되지 않습니다.
- 환경 변수가 없으면 앱은 오류 대신 "Supabase 연결이 필요해요" 안내 화면을 보여줍니다.
- 로컬에서 로그인하려면 Supabase URL Configuration의 Redirect URLs에 `http://localhost:3000/auth/callback`이 있어야 합니다(이메일 인증·Google 로그인 사용 시).

## 1. 브랜치 전략 (GitHub Flow)

| 브랜치            | 용도                                                       |
| ----------------- | ---------------------------------------------------------- |
| `main`            | 항상 배포 가능한 상태. Vercel 프로덕션이 이 브랜치를 배포. |
| `feat/<설명>`     | 새 기능                                                    |
| `fix/<설명>`      | 버그 수정                                                  |
| `docs/<설명>`     | 문서만 변경                                                |
| `chore/<설명>`    | 설정, 의존성, 빌드 등 기능과 무관한 작업                   |
| `refactor/<설명>` | 동작 변화 없는 코드 구조 개선                              |

- 브랜치 이름은 영어 소문자와 하이픈만 사용합니다. 예: `feat/timer-pause`, `fix/calendar-overflow`
- `main`에는 직접 커밋할 수 없습니다(커밋 훅이 막습니다). 작업 브랜치에서 커밋한 뒤 Pull Request로 병합하세요.
- PR을 열면 GitHub Actions(CI)가 타입 검사·린트·포맷·테스트·빌드를 실행하고, Vercel이 Preview 배포를 만듭니다. 둘 다 통과하면 병합합니다.
- 병합 후 작업 브랜치는 삭제해도 됩니다.

```bash
git switch main && git pull
git switch -c feat/my-change
# ...작업...
git add .
git commit -m "feat(todo): 마감 임박 필터 추가"
git push -u origin feat/my-change
# GitHub에서 Pull Request 생성 → CI 통과 확인 → Merge
```

## 2. 커밋 메시지 (Conventional Commits)

```
<type>(<scope>): <설명>

<본문 - 선택>
```

- `type`(필수, 영어): `feat` 기능 · `fix` 버그 · `docs` 문서 · `style` 포맷만 변경 · `refactor` 구조 개선 · `perf` 성능 · `test` 테스트 · `build` 빌드/의존성 · `ci` CI 설정 · `chore` 기타 · `revert` 되돌리기
- `scope`(선택): 변경 영역. `auth`, `db`, `subject`, `todo`, `timer`, `calendar`, `dashboard`, `analytics`, `settings`, `ui`
- `설명`(필수): 한국어로 무엇을 했는지 간결하게. 마침표 없이, 100자 이내
- 한 커밋에는 하나의 목적만 담습니다.

예시:

```
feat(timer): 일시정지 구간 기록 추가
fix(calendar): 자정을 넘긴 일정이 다음 날에 표시되지 않는 문제 수정
docs: Supabase 설정 방법 보완
```

규칙에 맞지 않는 메시지는 `commitlint`가 커밋을 거부합니다.

## 3. 코드 컨벤션

### 자동 검사

커밋할 때 변경된 파일에 대해 ESLint 자동 수정과 Prettier 포맷이 실행됩니다(`lint-staged`).
전체 검사는 다음 명령으로 실행합니다.

```bash
npm run check   # 타입 검사 + 린트 + 포맷 검사 + 단위 테스트
npm run build   # 프로덕션 빌드
```

### 네이밍

| 대상            | 규칙             | 예                                   |
| --------------- | ---------------- | ------------------------------------ |
| 파일·폴더       | kebab-case       | `todo-row.tsx`, `study-time.ts`      |
| React 컴포넌트  | PascalCase       | `TodoRow`, `TimerPanel`              |
| 함수·변수       | camelCase        | `splitSecondsByDay`, `activeSession` |
| 상수            | UPPER_SNAKE_CASE | `PRIORITY_LABELS`                    |
| 타입·인터페이스 | PascalCase       | `Todo`, `StudySession`               |
| DB 테이블·컬럼  | snake_case       | `study_sessions.started_at`          |
| 훅              | `use` 접두사     | `useActiveSession`                   |

### 작성 원칙

- TypeScript `strict` 모드를 유지하고 `any`를 쓰지 않습니다.
- 타입만 가져올 때는 `import type`을 사용합니다.
- 서버 비밀 키는 `NEXT_PUBLIC_` 접두사 없이 서버 환경 변수에만 둡니다. 비밀 값은 절대 커밋하지 않습니다.
- 날짜·시간 계산은 `src/lib/time.ts`의 함수를 사용하고, 사용자 설정 시간대를 기준으로 계산합니다.
- 색상·간격·글꼴은 `src/app/globals.css`의 디자인 토큰을 사용합니다. 임의의 HEX 값을 컴포넌트에 직접 쓰지 않습니다(과목 색상 제외).
- 사용자에게 보이는 문구는 자연스럽고 간결한 한국어로 씁니다.

## 4. DB 변경

- 스키마 변경은 `supabase/migrations/`에 새 SQL 파일을 추가합니다. 이미 적용된 마이그레이션 파일은 수정하지 않습니다.
- 파일 이름: `YYYYMMDDHHMMSS_<설명>.sql`
- 새 테이블에는 반드시 RLS를 켜고 정책을 추가한 뒤, `scripts/test-db.mjs`에 접근 제어 테스트를 추가합니다.
- **배포 순서: DB 먼저, 코드는 나중.** `main`에 병합하면 Vercel이 바로 새 코드를 배포합니다. 새 코드가 아직 없는 컬럼·함수를 쓰면 화면에 "데이터를 불러오지 못했어요"가 뜹니다. 그래서 마이그레이션이 포함된 작업은 아래 순서를 지킵니다.
  1. 작업 브랜치에서 `npm run test:db`로 마이그레이션을 검증합니다.
  2. Supabase **SQL Editor**에서 새 마이그레이션 파일을 실행합니다.
  3. 그다음에 `main`에 병합합니다.
- 가능하면 컬럼 추가처럼 **이전 코드와도 함께 동작하는 변경**으로 만들어, DB를 먼저 바꿔도 기존 화면이 깨지지 않게 합니다.
