# GA4 이벤트 명세

studay가 Google Analytics 4로 보내는 이벤트를 코드 기준으로 정리한 문서입니다. 이벤트를 추가하거나 바꾸면 이 문서도 함께 고칩니다. 설치·환경 변수·재배포 방법은 [배포 가이드 › 5. Google Analytics 4](deployment.md#5-google-analytics-4-선택)를 참고하세요.

- 측정 ID: 환경 변수 `NEXT_PUBLIC_GA_MEASUREMENT_ID` (운영: Vercel Production에만 등록)
- 코드: [`src/lib/analytics.ts`](../src/lib/analytics.ts) 이벤트 이름·파라미터 타입과 전송 함수, [`src/lib/data/mutations.ts`](../src/lib/data/mutations.ts) 저장 성공 후 전송 위치

## 수집 원칙

1. **성공한 작업만 보냅니다.** 버튼 클릭이 아니라 DB 저장·로그인이 성공한 직후에 보냅니다. 입력 검증 실패, 저장 실패, 로그인 실패는 보내지 않습니다.
2. **한 번만 보냅니다.** 타이머 일시정지·재개·종료는 DB 함수가 멱등이라 같은 요청이 다시 와도 같은 결과를 돌려줍니다. 결과마다 키를 만들어(`pause:<세션>:<updated_at>`, `complete:<세션>` 등) 같은 탭에서는 새로고침 후에도 다시 보내지 않습니다(sessionStorage, 최근 50개).
3. **개인정보를 보내지 않습니다.** 이름, 이메일, 할 일 제목, 과목명, 카테고리명, 메모, 각종 ID는 어떤 이벤트에도 넣지 않습니다. 파라미터는 `AnalyticsEvents` 타입에 정의한 필드만 보낼 수 있어서, 다른 값을 넣으면 타입 검사에서 실패합니다.
4. **GA가 꺼져 있어도 앱은 그대로 동작합니다.** 측정 ID가 없으면 태그를 불러오지 않고 모든 전송 함수는 아무 일도 하지 않습니다. 전송 중 오류가 나도 기능에는 영향을 주지 않습니다.
5. **page_view는 GA에 맡깁니다.** 첫 접속은 `config`가, 화면 이동은 GA 향상된 측정(브라우저 기록 이벤트 기반 페이지 변경)이 기록합니다. 앱은 page_view를 직접 보내지 않으므로 중복되지 않습니다.

## 이벤트 목록

| 이벤트                   | 의미                   | 파라미터                                                |
| ------------------------ | ---------------------- | ------------------------------------------------------- |
| `page_view`              | 페이지 조회 (GA 자동)  | GA 기본값 (`page_location`, `page_title` 등)            |
| `sign_up`                | 회원가입 완료          | `method`                                                |
| `login`                  | 로그인 완료            | `method`                                                |
| `subject_create`         | 과목 생성              | `has_weekly_goal`                                       |
| `todo_create`            | 할 일 생성             | `priority`, `has_due_date`, `has_category`              |
| `todo_complete`          | 할 일 완료             | 없음                                                    |
| `study_session_start`    | 공부 타이머 시작       | `with_todo`                                             |
| `study_session_pause`    | 공부 타이머 일시정지   | `segment_seconds`, `elapsed_seconds`, `elapsed_minutes` |
| `study_session_resume`   | 공부 타이머 재개       | 없음                                                    |
| `study_session_complete` | 공부 종료 및 기록 저장 | `duration_seconds`, `duration_minutes`, `with_todo`     |

## 이벤트 상세

### `sign_up` — 회원가입 완료

| 경로   | 보내는 시점                                                     | 위치                             |
| ------ | --------------------------------------------------------------- | -------------------------------- |
| Google | 처음 Google로 로그인해 계정이 새로 만들어진 경우, 다음 화면에서 | `src/app/auth/callback/route.ts` |

- `method`: `google`
- 로그인은 Google만 있으므로 실제로는 `method: google`만 발생합니다(`email` 값은 예전 데이터와 호환을 위해 타입에만 남아 있음).
- Google 신규 여부: 계정 생성 시각과 마지막 로그인 시각의 차이가 60초 미만이면 신규(`sign_up`), 아니면 `login`.

### `login` — 로그인 완료

| 경로   | 보내는 시점                                          | 위치                             |
| ------ | ---------------------------------------------------- | -------------------------------- |
| Google | 기존 계정으로 Google 로그인이 끝난 뒤, 다음 화면에서 | `src/app/auth/callback/route.ts` |

- `method`: `google`
- 로그인 실패, 이미 로그인된 상태로 앱을 다시 여는 경우(세션 유지)는 보내지 않습니다.

**서버에서 끝나는 로그인의 전달 방식:** Google 로그인은 서버 콜백에서 끝나서 브라우저 코드가 바로 이벤트를 보낼 수 없습니다. 콜백이 리다이렉트 응답에 5분짜리 쿠키 `studay_auth_event`(값 예: `sign_up.google`, `login.google`)를 붙이고, 다음 화면의 GA 컴포넌트가 이 쿠키를 읽어 이벤트를 한 번 보낸 뒤 바로 지웁니다. 측정 ID가 없으면 쿠키도 만들지 않습니다.

### `subject_create` — 과목 생성

- 시점: 과목이 DB에 저장된 직후 (`createSubject`)
- `has_weekly_goal`: `yes` | `no` — 주간 목표 공부 시간을 1분 이상 정했는지
- 과목 수정·보관·삭제·순서 변경은 보내지 않습니다.

### `todo_create` — 할 일 생성

- 시점: 할 일이 DB에 저장된 직후 (`createTodo`). 대시보드·할 일·과목 화면 어디서 만들어도 같은 함수를 거칩니다.
- `priority`: `high` | `medium` | `low`
- `has_due_date`: `yes` | `no` — 마감일 지정 여부
- `has_category`: `yes` | `no` — 카테고리 지정 여부
- 할 일 수정·삭제는 보내지 않습니다. 제목과 메모는 보내지 않습니다.

### `todo_complete` — 할 일 완료

- 시점: 할 일 상태가 미완료에서 완료로 **실제로 바뀐** 직후 (`setTodoStatus`). 이미 완료된 할 일을 다시 완료로 저장하면 바뀐 행이 없으므로 보내지 않습니다.
- 파라미터 없음
- 완료 취소(완료 → 미완료)는 보내지 않습니다. 취소했다가 다시 완료하면 새 완료로 한 번 더 보냅니다.

### `study_session_start` — 공부 타이머 시작

- 시점: `start_study_session` DB 함수가 새 세션을 만든 직후 (`startSession`)
- `with_todo`: `yes` | `no` — 할 일을 연결해 시작했는지
- 새로고침·페이지 이동 후 진행 중 세션을 복원할 때는 보내지 않습니다(시작 함수를 다시 부르지 않음).
- 이미 진행 중인 세션이 있어 시작이 거부되면 보내지 않습니다.

### `study_session_pause` — 공부 타이머 일시정지

- 시점: `pause_study_session` 성공 직후 (`pauseSession` → `trackPause`)
- `segment_seconds`: 숫자(초) — 직전 시작/재개부터 이번 일시정지까지 이어서 공부한 시간
- `elapsed_seconds`: 숫자(초) — 세션 시작부터 지금까지 공부한 시간(일시정지 시간 제외)
- `elapsed_minutes`: 숫자(분, 반올림) — `elapsed_seconds`를 분으로 바꾼 값
- 시간은 저장된 공부 구간(`study_segments`)에서 DB와 같은 방식(구간별 초 단위 내림)으로 계산합니다. 자정을 넘겨도 정확합니다. GA가 켜져 있을 때만 구간을 한 번 더 조회합니다.
- 중복 방지 키: `pause:<세션 ID>:<updated_at>`. 이미 일시정지된 세션에 일시정지 요청이 다시 가면 같은 행이 돌아오므로 한 번만 보냅니다.

### `study_session_resume` — 공부 타이머 재개

- 시점: `resume_study_session` 성공 직후 (`resumeSession`)
- 파라미터 없음
- 중복 방지 키: `resume:<세션 ID>:<updated_at>`. 이미 진행 중인 세션에 재개 요청이 다시 가면 한 번만 보냅니다.

### `study_session_complete` — 공부 종료 및 기록 저장

- 시점: `finish_study_session`이 세션을 `completed`로 저장한 직후 (`finishSession`)
- `duration_seconds`: 숫자(초) — 이번 세션의 총 공부 시간(일시정지 제외). 통계 화면과 같은 값
- `duration_minutes`: 숫자(분, 반올림)
- `with_todo`: `yes` | `no`
- 중복 방지 키: `complete:<세션 ID>`. 종료 버튼 연타, 네트워크 오류 후 재시도, 종료 후 새로고침에도 세션당 한 번만 보냅니다.
- 저장에 실패하면 보내지 않습니다(화면에는 재시도 버튼이 남음). 기록 없이 버리는 "기록 취소"와 나중에 기록 시간을 수정하는 것은 보내지 않습니다.

## 파라미터 사전

| 파라미터           | 타입   | 값                      | 쓰는 이벤트                                     | GA 등록 방법  |
| ------------------ | ------ | ----------------------- | ----------------------------------------------- | ------------- |
| `method`           | 문자열 | `email`, `google`       | `sign_up`, `login`                              | 맞춤 측정기준 |
| `has_weekly_goal`  | 문자열 | `yes`, `no`             | `subject_create`                                | 맞춤 측정기준 |
| `priority`         | 문자열 | `high`, `medium`, `low` | `todo_create`                                   | 맞춤 측정기준 |
| `has_due_date`     | 문자열 | `yes`, `no`             | `todo_create`                                   | 맞춤 측정기준 |
| `has_category`     | 문자열 | `yes`, `no`             | `todo_create`                                   | 맞춤 측정기준 |
| `with_todo`        | 문자열 | `yes`, `no`             | `study_session_start`, `study_session_complete` | 맞춤 측정기준 |
| `segment_seconds`  | 숫자   | 0 이상 정수(초)         | `study_session_pause`                           | 맞춤 측정항목 |
| `elapsed_seconds`  | 숫자   | 0 이상 정수(초)         | `study_session_pause`                           | 맞춤 측정항목 |
| `elapsed_minutes`  | 숫자   | 0 이상 정수(분)         | `study_session_pause`                           | 맞춤 측정항목 |
| `duration_seconds` | 숫자   | 0 이상 정수(초)         | `study_session_complete`                        | 맞춤 측정항목 |
| `duration_minutes` | 숫자   | 0 이상 정수(분)         | `study_session_complete`                        | 맞춤 측정항목 |

## GA 관리 화면 설정

이벤트가 GA에 한 번 이상 들어온 뒤에 설정합니다. 맞춤 정의는 **등록한 이후 데이터부터** 집계됩니다.

1. **맞춤 측정기준**: 관리 > 맞춤 정의 > 맞춤 측정기준 만들기 → 범위 **이벤트**, 이벤트 매개변수에 위 표의 문자열 파라미터 이름을 그대로 입력
2. **맞춤 측정항목**: 같은 화면의 맞춤 측정항목 탭 → 범위 **이벤트**, 측정 단위 **표준**, 위 표의 숫자 파라미터 등록 (보고서용으로는 `elapsed_minutes`, `duration_minutes`만 등록해도 충분)
3. **주요 이벤트**: 관리 > 이벤트에서 `sign_up`, `study_session_complete`를 주요 이벤트로 표시
4. **향상된 측정**: 데이터 스트림 > 향상된 측정 > 페이지 조회 > 고급 설정의 "브라우저 기록 이벤트 기반 페이지 변경"을 켠 상태로 유지

## 분석 예시

- **핵심 이용 흐름 이탈**: 탐색 > 유입경로 탐색 분석 → `sign_up` → `subject_create` → `todo_create` → `study_session_start` → `study_session_complete`
- **공부를 끝까지 마치는 비율**: `study_session_complete` 수 ÷ `study_session_start` 수
- **집중 지속 시간**: `study_session_pause`의 `segment_seconds` 분포(한 번에 얼마나 이어서 공부하는지)
- **세션당 공부 시간**: `study_session_complete`의 `duration_minutes` 평균
- **할 일 연결 효과**: `with_todo`별 `study_session_complete` 비율과 `duration_minutes` 비교
- **가입 경로**: `sign_up`의 `method`별 비율

## 이벤트를 추가할 때

1. `src/lib/analytics.ts`의 `AnalyticsEvents`에 이벤트 이름(영어 소문자 + 밑줄, 40자 이내)과 파라미터 타입을 추가합니다. 자유 입력 문자열(제목, 메모, 이름)이나 ID는 넣지 않습니다.
2. 버튼 핸들러가 아니라 **저장이 성공한 뒤**에 `trackEvent`를 호출합니다. 데이터 변경이면 `src/lib/data/mutations.ts`의 해당 함수 안에 둡니다.
3. 재시도·중복 요청으로 같은 결과가 다시 올 수 있는 작업이면 `trackEventOnce(고유 키, …)`를 씁니다.
4. `src/lib/analytics.test.ts`에 테스트를 추가하고 `npm run check`로 확인합니다.
5. 이 문서의 표와 상세 설명을 고치고, 필요하면 GA 맞춤 정의에 새 파라미터를 등록합니다.

## 검증 방법

- 단위 테스트: `src/lib/analytics.test.ts` (측정 ID 없음/형식 오류 시 무동작, 초기화 1회, `config` 형식, 중복 방지와 새로고침 후 유지, 콜백 쿠키 해석, Google 신규 가입 판정, 일시정지 공부 시간 계산)
- 브라우저: GA **보고서 > 실시간**, Tag Assistant 연결 후 **관리 > DebugView**, 또는 개발자 도구 Network에서 `collect` 필터 → `tid=<측정 ID>` 요청이 204인지 확인
- 로컬: `.env.local`에 `NEXT_PUBLIC_GA_MEASUREMENT_ID`와 `NEXT_PUBLIC_GA_DEBUG=true`를 넣고 `npm run dev`
