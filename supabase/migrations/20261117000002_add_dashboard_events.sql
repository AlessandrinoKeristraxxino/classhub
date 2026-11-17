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
  using ((select auth.uid()) = owner_id);

drop policy if exists "Users can create their own events" on public.events;
create policy "Users can create their own events"
  on public.events for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete their own events" on public.events;
create policy "Users can delete their own events"
  on public.events for delete to authenticated
  using ((select auth.uid()) = owner_id);

notify pgrst, 'reload schema';
