create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  subject text not null check (char_length(subject) between 1 and 100),
  date date not null,
  description text not null default '' check (char_length(description) <= 20000),
  attachment_path text,
  attachment_name text,
  created_at timestamptz not null default now(),
  constraint lessons_attachment_fields_check check (
    (attachment_path is null) = (attachment_name is null)
  )
);

create index if not exists lessons_owner_date_idx
  on public.lessons (owner_id, date desc);

alter table public.lessons enable row level security;
revoke all on table public.lessons from anon;
grant usage on schema public to authenticated;
grant select, insert on table public.lessons to authenticated;

drop policy if exists "Users can read their own lessons"
  on public.lessons;

create policy "Users can read their own lessons"
  on public.lessons for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Users can create their own lessons"
  on public.lessons;

create policy "Users can create their own lessons"
  on public.lessons for insert to authenticated
  with check ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-files',
  'lesson-files',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own lesson files"
  on storage.objects;

create policy "Users can read their own lesson files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'lesson-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload their own lesson files"
  on storage.objects;

create policy "Users can upload their own lesson files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'lesson-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own lesson files"
  on storage.objects;

create policy "Users can delete their own lesson files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'lesson-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

notify pgrst, 'reload schema';
