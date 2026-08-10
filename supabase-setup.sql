-- CrimsonJS Supabase setup
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor). Safe to re-run.
--
-- Why this is required: the anon key shipped in crimson.js is PUBLIC by design.
-- Anyone can copy it out of DevTools and query the database directly with it.
-- No amount of client-side JavaScript can prevent that. The only real
-- protection is Row Level Security (RLS): the database itself refuses to
-- return rows the caller is not allowed to see.

-- 1) Lock down the profiles table. With RLS enabled and no matching policy,
--    every select/insert/update/delete is denied — including raw REST calls
--    made with the anon key from a terminal or browser console.
alter table public.profiles enable row level security;

-- Signed-in users can read only their own row. Anonymous callers get nothing.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Signed-in users can insert only a row whose id is their own user id.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- No update/delete policies on purpose: nobody can update or delete rows
-- through the public API at all.

-- 2) The public member counter. SECURITY DEFINER lets this function count
--    rows the caller cannot read; only the number ever leaves the database.
create or replace function public.get_site_user_count(site_name text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint from public.profiles where site = site_name;
$$;

revoke all on function public.get_site_user_count(text) from public;
grant execute on function public.get_site_user_count(text) to anon, authenticated;

-- 3) Usernames no longer need to be globally unique across sites.
alter table public.profiles
  drop constraint if exists profiles_username_global_unique;
