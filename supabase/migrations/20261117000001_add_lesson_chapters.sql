alter table public.lessons
  add column if not exists chapters jsonb not null default '[]'::jsonb;

alter table public.lessons
  drop constraint if exists lessons_chapters_array_check;

alter table public.lessons
  add constraint lessons_chapters_array_check
  check (jsonb_typeof(chapters) = 'array');

notify pgrst, 'reload schema';
