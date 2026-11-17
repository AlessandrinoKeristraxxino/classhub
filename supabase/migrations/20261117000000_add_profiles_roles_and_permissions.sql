create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '',
  avatar_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  permission_key text not null unique
    check (permission_key ~ '^[a-z][a-z0-9._-]{1,79}$'),
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create or replace function public.is_classhub_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(coalesce((select auth.jwt() ->> 'email'), ''))
    = 'alessandro.luigi.napoli@gmail.com';
$$;

create or replace function public.has_classhub_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_classhub_admin()
    or exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = (select auth.uid())
        and p.permission_key = permission_name
    );
$$;

revoke all on function public.is_classhub_admin() from public, anon;
revoke all on function public.has_classhub_permission(text) from public, anon;
grant execute on function public.is_classhub_admin() to authenticated;
grant execute on function public.has_classhub_permission(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

grant select on public.profiles to authenticated;
grant update (display_name, avatar_path) on public.profiles to authenticated;
grant select, insert, update, delete
  on public.roles, public.permissions, public.role_permissions, public.user_roles
  to authenticated;

drop policy if exists "Users and administrators can read profiles"
  on public.profiles;
create policy "Users and administrators can read profiles"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_classhub_admin()));

drop policy if exists "Users can update their own profile"
  on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Administrators can manage roles" on public.roles;
create policy "Administrators can manage roles"
  on public.roles for all to authenticated
  using ((select public.is_classhub_admin()))
  with check ((select public.is_classhub_admin()));

drop policy if exists "Administrators can manage permissions"
  on public.permissions;
create policy "Administrators can manage permissions"
  on public.permissions for all to authenticated
  using ((select public.is_classhub_admin()))
  with check ((select public.is_classhub_admin()));

drop policy if exists "Administrators can manage role permissions"
  on public.role_permissions;
create policy "Administrators can manage role permissions"
  on public.role_permissions for all to authenticated
  using ((select public.is_classhub_admin()))
  with check ((select public.is_classhub_admin()));

drop policy if exists "Administrators can manage user roles"
  on public.user_roles;
create policy "Administrators can manage user roles"
  on public.user_roles for all to authenticated
  using ((select public.is_classhub_admin()))
  with check ((select public.is_classhub_admin()));

insert into public.roles (name, description)
values ('Studente', 'Ruolo predefinito per chi crea e consulta le proprie lezioni.')
on conflict (name) do nothing;

insert into public.permissions (permission_key, description)
values ('lessons.create', 'Consente di creare lezioni.')
on conflict (permission_key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'Studente'
  and p.permission_key = 'lessons.create'
on conflict do nothing;

insert into public.profiles (user_id, email)
select id, email
from auth.users
where email is not null
on conflict (user_id) do update set email = excluded.email;

insert into public.user_roles (user_id, role_id)
select u.id, r.id
from auth.users u
cross join public.roles r
where r.name = 'Studente'
on conflict do nothing;

create or replace function public.handle_new_classhub_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do update set email = excluded.email;

  insert into public.user_roles (user_id, role_id)
  select new.id, r.id
  from public.roles r
  where r.name = 'Studente'
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_classhub on auth.users;
create trigger on_auth_user_created_classhub
  after insert or update of email on auth.users
  for each row execute function public.handle_new_classhub_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own avatar files"
  on storage.objects;
create policy "Users can read their own avatar files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload their own avatar files"
  on storage.objects;
create policy "Users can upload their own avatar files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update their own avatar files"
  on storage.objects;
create policy "Users can update their own avatar files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own avatar files"
  on storage.objects;
create policy "Users can delete their own avatar files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can create their own lessons"
  on public.lessons;
create policy "Users can create their own lessons"
  on public.lessons for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and (select public.has_classhub_permission('lessons.create'))
  );

notify pgrst, 'reload schema';
