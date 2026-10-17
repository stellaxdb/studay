-- Subject colors move to a pastel palette that matches the design system.
-- Existing subjects keep the same position in the palette (파랑 → 블루, …);
-- colors outside the old palette are left as they are.
update public.subjects
set color = case upper(color)
  when '#6C5CE7' then '#C9C3F9'
  when '#3B82F6' then '#ADCDFC'
  when '#0EA5E9' then '#96D5F1'
  when '#0D9488' then '#93DBCC'
  when '#16A34A' then '#AAD9AF'
  when '#CA8A04' then '#DACB93'
  when '#EA580C' then '#F2BE9C'
  when '#DC2626' then '#F8B8B2'
  when '#DB2777' then '#F3B7CD'
  when '#64748B' then '#C3CBD8'
  else color
end
where upper(color) in (
  '#6C5CE7', '#3B82F6', '#0EA5E9', '#0D9488', '#16A34A',
  '#CA8A04', '#EA580C', '#DC2626', '#DB2777', '#64748B'
);

alter table public.subjects alter column color set default '#C9C3F9';
