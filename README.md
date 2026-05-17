# CrimsonJS

[![](https://data.jsdelivr.com/v1/package/gh/eldiiarbekbolotov/crimsonjs/badge)](https://www.jsdelivr.com/package/gh/eldiiarbekbolotov/crimsonjs)

CrimsonJS is an embeddable auth-gatekeeping widget for client websites. A host site defines `window.CrimsonConfig`, loads Supabase, and then loads `crimson.min.js`. If the site-specific localStorage key is missing, CrimsonJS locks page scrolling and renders an un-closable login/signup modal over the entire viewport.

Important: a browser overlay is not a true security boundary. Users can edit localStorage or block JavaScript. Use this widget to gate the client experience, and protect genuinely sensitive content server-side.

## Part 1: Supabase Backend Setup & Security

### 1. Create the Supabase project

1. Open the Supabase Dashboard and create a project.
2. Go to **Authentication > Providers > Email** and enable email/password auth.
3. For instant unlock after signup, disable **Confirm email** while testing. For production, keep confirmation enabled and add every client domain under **Authentication > URL Configuration > Redirect URLs**.
4. Go to **Project Settings > API** and copy the project URL plus the publishable/anon key. Never expose the `service_role` key in CrimsonJS or on a customer website.

Supabase native Auth owns registration, password hashing, sessions, refresh tokens, and the encrypted `auth.users` identity table. CrimsonJS never stores passwords in `public.profiles`.

Design note: Supabase Auth keeps email identities unique per Supabase project. The schema below treats one Auth user as reusable across multiple client sites, then records per-site membership in `public.profiles` with primary key `(id, site)` and unique `(email, site)`.

### 2. Run the SQL

Run [supabase/crimson_auth_setup.sql](/Users/eldiiar/CrimsonJS/supabase/crimson_auth_setup.sql) in **SQL Editor**.

```sql
-- CrimsonJS Auth Gate Supabase setup
-- Run this once in Supabase Dashboard > SQL Editor.

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
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_own"
on public.profiles for insert
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
```

The script includes a private trigger that copies `username`, `email`, and `site` from Supabase Auth metadata into `public.profiles` on signup. Anonymous users receive no profile table read permission. The public RPC returns only an aggregate count.

### 3. Dashboard checks

1. Open **Table Editor > profiles** and confirm RLS is enabled.
2. Open **Authentication > Policies** and confirm only authenticated users can select/insert their own rows.
3. Open **Project Settings > API/Data API** and keep only the `public` schema exposed.
4. Confirm `get_site_user_count(site_name text)` appears under Database functions/RPC.
5. Keep the `service_role` key only in trusted server environments.

## Part 2: JavaScript & CSS Source Files Configuration

Primary source files:

- [crimson.js](/Users/eldiiar/CrimsonJS/crimson.js)
- [crimson.css](/Users/eldiiar/CrimsonJS/crimson.css)

CDN deployment paths:

- [js/crimson.min.js](/Users/eldiiar/CrimsonJS/js/crimson.min.js)
- [css/crimson.min.css](/Users/eldiiar/CrimsonJS/css/crimson.min.css)

Before minifying, replace these constants in [crimson.js](/Users/eldiiar/CrimsonJS/crimson.js:7):

```js
var SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
var SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Runtime behavior:

1. Reads `window.CrimsonConfig.siteName` and `window.CrimsonConfig.description`.
2. Checks `localStorage` for `crimson_auth_${siteName}` using a sanitized site slug.
3. If present, exits quietly without loading CSS or Supabase.
4. If missing, injects `css/crimson.min.css`, locks page scrolling, and renders the split-pane modal.
5. Uses Supabase Auth for `signUp` and `signInWithPassword`.
6. Writes the site-specific localStorage key only after login/signup succeeds.
7. Removes the modal and body lock after authentication.
8. Catches database/client errors without logging raw Supabase errors to the browser console.

Validation:

- Username: normalized lowercase, 4 to 32 characters, at least 4 letters, using letters, numbers, underscore, dot, or hyphen.
- Email: standard client-side email shape.
- Password: 8+ characters with lowercase, uppercase, number, and symbol.

The counter calls:

```js
await supabase.rpc("get_site_user_count", { site_name: siteName });
```

No raw profile lists are exposed to anonymous users.

## Part 3: Consumer Integration Guide

Add this snippet before the closing `</body>` tag of the client website:

```html
<script>
  window.CrimsonConfig = {
    siteName: "Univa Dev",
    description: "Univa Dev is a STEM nonprofit."
  };
</script>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdn.yourdomain.com/crimson/js/crimson.min.js"></script>
```

If the localStorage key is absent, visitors see:

- Left pane: the client site name, description, and `Join [X] users already on [Site Name]`.
- Right pane: tabbed Login and Signup forms.
- Locked host page scrolling and interaction until authentication completes.

For local testing, you can clear the gate with:

```js
localStorage.removeItem("crimson_auth_Univa_Dev");
```

For production:

- Serve `js/crimson.min.js` and `css/crimson.min.css` from the same CDN root so the script can resolve the CSS file automatically.
- Use HTTPS on the client site.
- Add the client domain to Supabase Auth redirect URLs if email confirmation is enabled.
- Add an approved-sites table or signed site config if site names affect billing, analytics, or abuse prevention.
- Keep Supabase RLS enabled and never ship a service-role key.

## References

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase password auth: https://supabase.com/docs/guides/auth/passwords
- Supabase user data/profiles: https://supabase.com/docs/guides/auth/managing-user-data
- Supabase JavaScript CDN install: https://supabase.com/docs/reference/javascript/installing
