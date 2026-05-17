-- CrimsonJS Auth Gate Supabase setup
begin;

create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  email text not null,
  site text not null,

  constraint profiles_pkey primary key (id, site),
  constraint profiles_username_min_length check (char_length(username) >= 4),
  constraint profiles_username_max_length check (char_length(username) <= 32),
  constraint profiles_username_trimmed check (username = btrim(username)),
  constraint profiles_username_lowercase check (username = lower(username)),
  constraint profiles_username_chars check (username ~ '^[A-Za-z0-9_.-]+$'),
  constraint profiles_username_letters check (char_length(regexp_replace(username, '[^A-Za-z]', '', 'g')) >= 4),
  constraint profiles_email_normalized check (email = lower(btrim(email))),
  constraint profiles_email_format check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint profiles_site_trimmed check (site = btrim(site)),
  constraint profiles_site_not_empty check (char_length(site) > 0),
  constraint profiles_username_global_unique unique (username),
  constraint profiles_email_site_unique unique (email, site)
);

comment on table public.profiles is
  'Public CrimsonJS profile rows. Passwords are never stored here; Supabase Auth stores credentials in auth.users.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from public;
revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;

grant usage on schema public to anon, authenticated;
grant select, insert on table public.profiles to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (
  (select auth.uid()) = id
  and email = lower((select auth.jwt() ->> 'email'))
);

create or replace function private.handle_new_crimson_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_username text := nullif(btrim(new.raw_user_meta_data ->> 'username'), '');
  profile_site text := nullif(btrim(new.raw_user_meta_data ->> 'site'), '');
begin
  if profile_username is not null and profile_site is not null and new.email is not null then
    insert into public.profiles (id, username, email, site)
    values (new.id, profile_username, lower(new.email), profile_site)
    on conflict (id, site) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.handle_new_crimson_user() from public;

drop trigger if exists on_auth_user_created_crimson_profile on auth.users;

create trigger on_auth_user_created_crimson_profile
after insert on auth.users
for each row execute function private.handle_new_crimson_user();

create or replace function public.get_site_user_count(site_name text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.profiles
  where public.profiles.site = btrim(site_name);
$$;

comment on function public.get_site_user_count(text) is
  'Returns only an aggregate CrimsonJS user count for one site. Does not expose profile rows.';

revoke all on function public.get_site_user_count(text) from public;
grant execute on function public.get_site_user_count(text) to anon, authenticated;

commit;
