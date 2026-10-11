-- Manual subject order (set by drag and drop on the 과목 screen).

alter table public.subjects add column sort_order integer;

-- Existing subjects keep their creation order.
update public.subjects s
set sort_order = ranked.position
from (
  select id, (row_number() over (partition by user_id order by created_at, id) - 1)::integer as position
  from public.subjects
) ranked
where ranked.id = s.id;

-- New subjects go to the end of the owner's list unless an order is given.
create or replace function public.subjects_default_sort_order()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sort_order is null then
    select coalesce(max(s.sort_order) + 1, 0) into new.sort_order
    from public.subjects s
    where s.user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger subjects_default_sort_order
  before insert on public.subjects
  for each row execute function public.subjects_default_sort_order();

alter table public.subjects alter column sort_order set not null;

drop index if exists public.subjects_user_idx;
create index subjects_user_idx on public.subjects (user_id, is_archived, sort_order);

-- Saves a new order in one transaction. Runs with the caller's rights, so RLS
-- limits it to the caller's own subjects; unknown or foreign ids are ignored.
create or replace function public.reorder_subjects(p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.subjects s
  set sort_order = o.position - 1
  from unnest(p_ids) with ordinality as o(id, position)
  where s.id = o.id;
$$;

revoke execute on function public.subjects_default_sort_order() from public, anon;
revoke execute on function public.reorder_subjects(uuid[]) from public, anon;
grant execute on function public.reorder_subjects(uuid[]) to authenticated;
