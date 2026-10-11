-- studay: initial schema
-- Tables: user_settings, subjects, categories, todos, calendar_events,
--         study_sessions, study_segments
-- Every user-owned row is protected by Row Level Security.
-- Study time is derived ONLY from study_segments (one row per uninterrupted
-- running interval). Timer state changes go through SECURITY DEFINER
-- functions so the client can never write raw time values.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------------
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 30),
  timezone text not null default 'Asia/Seoul' check (char_length(timezone) between 1 and 64),
  daily_goal_minutes integer not null default 120 check (daily_goal_minutes between 0 and 1440),
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'INVALID_TIMEZONE' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger user_settings_validate_timezone
  before insert or update of timezone on public.user_settings
  for each row execute function public.validate_timezone();

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Create a settings row automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (user_id, display_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 30), '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  description text check (description is null or char_length(description) <= 200),
  color text not null default '#6C5CE7' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  weekly_goal_minutes integer not null default 0 check (weekly_goal_minutes between 0 and 10080),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_id_user_unique unique (id, user_id)
);

create index subjects_user_idx on public.subjects (user_id, is_archived, created_at);

create trigger subjects_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- categories (always belong to exactly one subject)
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  subject_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 30),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_subject_fk foreign key (subject_id, user_id)
    references public.subjects (id, user_id) on delete cascade,
  constraint categories_id_subject_unique unique (id, subject_id),
  constraint categories_subject_name_unique unique (subject_id, name)
);

create index categories_user_idx on public.categories (user_id, subject_id, sort_order);

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- todos
-- ---------------------------------------------------------------------------
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  subject_id uuid not null,
  category_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  note text check (note is null or char_length(note) <= 2000),
  status text not null default 'todo' check (status in ('todo', 'done')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date date,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 1440),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint todos_completed_consistency check ((status = 'done') = (completed_at is not null)),
  constraint todos_subject_fk foreign key (subject_id, user_id)
    references public.subjects (id, user_id) on delete cascade,
  -- Guarantees the category belongs to the same subject as the todo.
  -- Deleting a category moves its todos to "uncategorized".
  constraint todos_category_fk foreign key (category_id, subject_id)
    references public.categories (id, subject_id) on delete set null (category_id),
  constraint todos_id_user_unique unique (id, user_id)
);

create index todos_user_status_idx on public.todos (user_id, status, due_date);
create index todos_subject_idx on public.todos (subject_id);
create index todos_category_idx on public.todos (category_id);

create or replace function public.todos_sync_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' then
    if tg_op = 'UPDATE' and old.status = 'done' then
      new.completed_at = coalesce(new.completed_at, old.completed_at);
    else
      new.completed_at = coalesce(new.completed_at, now());
    end if;
  else
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger todos_sync_completed_at
  before insert or update on public.todos
  for each row execute function public.todos_sync_completed_at();

create trigger todos_updated_at
  before update on public.todos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- calendar_events (independent events only; TODO due dates are derived
-- from todos.due_date and never copied here)
-- ---------------------------------------------------------------------------
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  event_type text not null default 'personal'
    check (event_type in ('exam', 'class', 'assignment', 'personal', 'other')),
  all_day boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz,
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_time_order check (ends_at is null or ends_at >= starts_at),
  -- Deleting a subject keeps the event but removes the subject link.
  constraint calendar_events_subject_fk foreign key (subject_id, user_id)
    references public.subjects (id, user_id) on delete set null (subject_id)
);

create index calendar_events_user_time_idx on public.calendar_events (user_id, starts_at);

create trigger calendar_events_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- study_sessions + study_segments
-- ---------------------------------------------------------------------------
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid not null,
  todo_id uuid,
  status text not null default 'running' check (status in ('running', 'paused', 'completed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- Cached sum of segment durations, written only when the session completes.
  total_seconds integer not null default 0 check (total_seconds >= 0),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_completed_consistency check ((status = 'completed') = (ended_at is not null)),
  constraint study_sessions_time_order check (ended_at is null or ended_at >= started_at),
  constraint study_sessions_subject_fk foreign key (subject_id, user_id)
    references public.subjects (id, user_id) on delete cascade,
  constraint study_sessions_todo_fk foreign key (todo_id, user_id)
    references public.todos (id, user_id) on delete set null (todo_id),
  constraint study_sessions_id_user_unique unique (id, user_id)
);

-- At most ONE running/paused session per user.
create unique index study_sessions_one_active_per_user
  on public.study_sessions (user_id)
  where status in ('running', 'paused');

create index study_sessions_user_started_idx on public.study_sessions (user_id, started_at desc);

create or replace function public.study_sessions_validate_todo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.todo_id is not null and not exists (
    select 1 from public.todos t
    where t.id = new.todo_id and t.subject_id = new.subject_id and t.user_id = new.user_id
  ) then
    raise exception 'TODO_SUBJECT_MISMATCH' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger study_sessions_validate_todo
  before insert or update of todo_id, subject_id on public.study_sessions
  for each row execute function public.study_sessions_validate_todo();

create trigger study_sessions_updated_at
  before update on public.study_sessions
  for each row execute function public.set_updated_at();

create table public.study_segments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint study_segments_time_order check (ended_at is null or ended_at >= started_at),
  constraint study_segments_session_fk foreign key (session_id, user_id)
    references public.study_sessions (id, user_id) on delete cascade
);

-- At most one open segment per session and per user.
create unique index study_segments_one_open_per_session
  on public.study_segments (session_id) where ended_at is null;
create unique index study_segments_one_open_per_user
  on public.study_segments (user_id) where ended_at is null;
create index study_segments_user_time_idx on public.study_segments (user_id, started_at);
create index study_segments_session_idx on public.study_segments (session_id);

-- ---------------------------------------------------------------------------
-- Timer functions (SECURITY DEFINER, but always scoped to auth.uid())
-- ---------------------------------------------------------------------------
create or replace function public.server_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$ select now(); $$;

create or replace function public.start_study_session(p_subject_id uuid, p_todo_id uuid default null)
returns public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_session public.study_sessions;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.subjects s
    where s.id = p_subject_id and s.user_id = v_uid and not s.is_archived
  ) then
    raise exception 'SUBJECT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_todo_id is not null and not exists (
    select 1 from public.todos t
    where t.id = p_todo_id and t.user_id = v_uid and t.subject_id = p_subject_id
  ) then
    raise exception 'TODO_SUBJECT_MISMATCH' using errcode = 'P0002';
  end if;

  begin
    insert into public.study_sessions (user_id, subject_id, todo_id, status, started_at)
    values (v_uid, p_subject_id, p_todo_id, 'running', v_now)
    returning * into v_session;
  exception when unique_violation then
    raise exception 'ACTIVE_SESSION_EXISTS' using errcode = 'P0001';
  end;

  insert into public.study_segments (user_id, session_id, started_at)
  values (v_uid, v_session.id, v_now);

  return v_session;
end;
$$;

create or replace function public.pause_study_session(p_session_id uuid)
returns public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_session public.study_sessions;
begin
  select * into v_session from public.study_sessions
  where id = p_session_id and user_id = v_uid
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_session.status = 'paused' then
    return v_session; -- idempotent
  end if;
  if v_session.status <> 'running' then
    raise exception 'SESSION_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  update public.study_segments
  set ended_at = greatest(v_now, started_at)
  where session_id = p_session_id and ended_at is null;

  update public.study_sessions set status = 'paused'
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

create or replace function public.resume_study_session(p_session_id uuid)
returns public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_session public.study_sessions;
begin
  select * into v_session from public.study_sessions
  where id = p_session_id and user_id = v_uid
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_session.status = 'running' then
    return v_session; -- idempotent
  end if;
  if v_session.status <> 'paused' then
    raise exception 'SESSION_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  insert into public.study_segments (user_id, session_id, started_at)
  values (v_uid, p_session_id, v_now);

  update public.study_sessions set status = 'running'
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

create or replace function public.finish_study_session(p_session_id uuid, p_note text default null)
returns public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_session public.study_sessions;
  v_total integer;
begin
  select * into v_session from public.study_sessions
  where id = p_session_id and user_id = v_uid
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_session.status = 'completed' then
    return v_session; -- idempotent: never counted twice
  end if;

  update public.study_segments
  set ended_at = greatest(v_now, started_at)
  where session_id = p_session_id and ended_at is null;

  select coalesce(sum(floor(extract(epoch from (ended_at - started_at))))::integer, 0)
  into v_total
  from public.study_segments
  where session_id = p_session_id;

  update public.study_sessions
  set status = 'completed',
      ended_at = v_now,
      total_seconds = v_total,
      note = coalesce(nullif(btrim(p_note), ''), note)
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

-- Correct a completed session's time range. Replaces its segments with one
-- interval and refuses ranges that overlap another session (no double count).
create or replace function public.update_study_session_time(
  p_session_id uuid,
  p_started_at timestamptz,
  p_ended_at timestamptz
)
returns public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_session public.study_sessions;
begin
  select * into v_session from public.study_sessions
  where id = p_session_id and user_id = v_uid
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_session.status <> 'completed' then
    raise exception 'SESSION_NOT_COMPLETED' using errcode = 'P0001';
  end if;
  if p_ended_at <= p_started_at then
    raise exception 'INVALID_TIME_RANGE' using errcode = '22023';
  end if;
  if p_ended_at > now() + interval '1 minute' then
    raise exception 'TIME_IN_FUTURE' using errcode = '22023';
  end if;
  if p_ended_at - p_started_at > interval '24 hours' then
    raise exception 'SESSION_TOO_LONG' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.study_segments g
    where g.user_id = v_uid
      and g.session_id <> p_session_id
      and tstzrange(g.started_at, coalesce(g.ended_at, now()), '[)')
          && tstzrange(p_started_at, p_ended_at, '[)')
  ) then
    raise exception 'SESSION_OVERLAP' using errcode = '23P01';
  end if;

  delete from public.study_segments where session_id = p_session_id;
  insert into public.study_segments (user_id, session_id, started_at, ended_at)
  values (v_uid, p_session_id, p_started_at, p_ended_at);

  update public.study_sessions
  set started_at = p_started_at,
      ended_at = p_ended_at,
      total_seconds = floor(extract(epoch from (p_ended_at - p_started_at)))::integer
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.user_settings enable row level security;
alter table public.subjects enable row level security;
alter table public.categories enable row level security;
alter table public.todos enable row level security;
alter table public.calendar_events enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_segments enable row level security;

create policy "own settings: select" on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own settings: insert" on public.user_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own settings: update" on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own subjects" on public.subjects
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own categories" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own todos" on public.todos
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own events" on public.calendar_events
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own sessions: select" on public.study_sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own sessions: update" on public.study_sessions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own sessions: delete" on public.study_sessions
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "own segments: select" on public.study_segments
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Privileges: anon gets nothing; authenticated gets only what the app needs.
-- Sessions/segments cannot be inserted or have their times edited directly.
-- ---------------------------------------------------------------------------
revoke all on table
  public.user_settings, public.subjects, public.categories, public.todos,
  public.calendar_events, public.study_sessions, public.study_segments
from anon, authenticated;

grant select, insert, update on table public.user_settings to authenticated;
grant select, insert, update, delete on table
  public.subjects, public.categories, public.todos, public.calendar_events
to authenticated;
grant select, delete on table public.study_sessions to authenticated;
grant update (subject_id, todo_id, note) on table public.study_sessions to authenticated;
grant select on table public.study_segments to authenticated;

revoke execute on function
  public.server_now(),
  public.start_study_session(uuid, uuid),
  public.pause_study_session(uuid),
  public.resume_study_session(uuid),
  public.finish_study_session(uuid, text),
  public.update_study_session_time(uuid, timestamptz, timestamptz),
  public.handle_new_user(),
  public.validate_timezone(),
  public.set_updated_at(),
  public.todos_sync_completed_at(),
  public.study_sessions_validate_todo()
from public, anon;

grant execute on function
  public.server_now(),
  public.start_study_session(uuid, uuid),
  public.pause_study_session(uuid),
  public.resume_study_session(uuid),
  public.finish_study_session(uuid, text),
  public.update_study_session_time(uuid, timestamptz, timestamptz)
to authenticated;
