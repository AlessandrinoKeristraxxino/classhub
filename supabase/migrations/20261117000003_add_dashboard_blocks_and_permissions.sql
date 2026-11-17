-- Ensure deployments that skipped the events migration can apply this one safely.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists events_owner_starts_at_idx
  on public.events (owner_id, starts_at);

alter table public.events enable row level security;
revoke all on table public.events from anon;
grant select, insert, delete on table public.events to authenticated;

drop policy if exists "Users can read their own events" on public.events;
create policy "Users can read their own events"
  on public.events for select to authenticated
  using (
    (select auth.uid()) = owner_id
    or (select public.has_classhub_permission('events.delete_any'))
  );

drop policy if exists "Users can create their own events" on public.events;
drop policy if exists "Users can create events with permission" on public.events;
create policy "Users can create events with permission"
  on public.events for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and (select public.has_classhub_permission('events.create'))
  );

drop policy if exists "Users can delete their own events" on public.events;
drop policy if exists "Users can delete events with permission" on public.events;
create policy "Users can delete events with permission"
  on public.events for delete to authenticated
  using (
    (
      (select auth.uid()) = owner_id
      and (select public.has_classhub_permission('events.delete_own'))
    )
    or (select public.has_classhub_permission('events.delete_any'))
  );

create table if not exists public.dashboard_blocks (
  id uuid primary key default gen_random_uuid(),
  block_type text not null check (block_type in ('box', 'text', 'link')),
  title text not null default '' check (char_length(title) <= 160),
  body text not null default '' check (char_length(body) <= 5000),
  link_url text,
  link_label text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint dashboard_blocks_link_check check (
    (block_type = 'link' and link_url is not null and link_label is not null)
    or (block_type <> 'link')
  )
);

alter table public.dashboard_blocks enable row level security;
revoke all on table public.dashboard_blocks from anon;
grant select, insert, update, delete on table public.dashboard_blocks
  to authenticated;

drop policy if exists "Authenticated users can read dashboard blocks"
  on public.dashboard_blocks;
create policy "Authenticated users can read dashboard blocks"
  on public.dashboard_blocks for select to authenticated using (true);

drop policy if exists "Authorized users can manage dashboard blocks"
  on public.dashboard_blocks;
create policy "Authorized users can manage dashboard blocks"
  on public.dashboard_blocks for all to authenticated
  using ((select public.has_classhub_permission('dashboard.manage')))
  with check ((select public.has_classhub_permission('dashboard.manage')));

insert into public.permissions (permission_key, description)
values
  ('lessons.create', 'Creare lezioni.'),
  ('lessons.delete_own', 'Eliminare le proprie lezioni.'),
  ('lessons.delete_any', 'Eliminare tutte le lezioni.'),
  ('events.create', 'Aggiungere eventi alla propria dashboard.'),
  ('events.delete_own', 'Eliminare i propri eventi.'),
  ('events.delete_any', 'Eliminare tutti gli eventi.'),
  ('dashboard.manage', 'Modificare i contenuti condivisi della dashboard.')
on conflict (permission_key) do update
set description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Studente'
  and p.permission_key in (
    'lessons.create',
    'lessons.delete_own',
    'events.create',
    'events.delete_own'
  )
on conflict do nothing;

drop policy if exists "Users can delete their own lessons" on public.lessons;
create policy "Users can delete their own lessons"
  on public.lessons for delete to authenticated
  using (
    (
      (select auth.uid()) = owner_id
      and (select public.has_classhub_permission('lessons.delete_own'))
    )
    or (select public.has_classhub_permission('lessons.delete_any'))
  );

drop policy if exists "Users and privileged roles can read lessons"
  on public.lessons;
create policy "Users and privileged roles can read lessons"
  on public.lessons for select to authenticated
  using (
    (select auth.uid()) = owner_id
    or (select public.has_classhub_permission('lessons.delete_any'))
  );

drop policy if exists "Users can delete their own lesson files"
  on storage.objects;
drop policy if exists "Users can delete lesson files with permission"
  on storage.objects;
create policy "Users can delete lesson files with permission"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'lesson-files'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.has_classhub_permission('lessons.delete_any'))
    )
  );

notify pgrst, 'reload schema';
