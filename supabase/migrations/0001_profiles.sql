-- Profiles: one row per account.
--
-- Supabase already stores the account itself in auth.users, and that table is
-- not ours to extend -- so anything the app wants to know about a person lives
-- here, keyed by the same id. Deleting the account deletes the profile with
-- it, which is what "delete my account" has to mean.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- RLS is the security boundary, not an extra.
--
-- The anon key ships inside the client bundle, so every visitor holds it.
-- What stops one person reading another's row is these policies and nothing
-- else. Each is scoped to auth.uid(), the id Supabase proves from the token.
-- TO authenticated, not auth.role().
--
-- auth.role() is deprecated, and it also breaks silently the moment anonymous
-- sign-ins are enabled: an anonymous visitor carries the authenticated role and
-- passes the check without being anybody. The TO clause says the same thing to
-- the planner and does not lie later.
--
-- TO authenticated ALONE would be authentication without authorization -- it
-- checks the role, not the row, which is how you get IDOR. The ownership
-- predicate in USING is the half that matters.
--
-- (select auth.uid()) rather than auth.uid(): wrapped, it is an initplan and
-- runs once; bare, it is called per row.
create policy "profiles are readable by their owner"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- UPDATE needs both. USING decides which rows may be updated; WITH CHECK
-- decides what they may become. Without the second, a user can reassign a row
-- to somebody else's id. Postgres also needs the SELECT policy above for an
-- UPDATE to see its row at all -- without one it silently affects zero rows.
create policy "profiles are updatable by their owner"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No insert policy on purpose: rows arrive from the trigger below, which runs
-- as the definer. A client that could insert its own profile could insert one
-- against somebody else's id.

-- Reachability, which is separate from RLS.
--
-- RLS decides which ROWS are visible once a table can be reached at all.
-- Depending on the project's Data API settings, a table created in SQL may not
-- be exposed to the API roles -- and the symptom is a table that plainly exists
-- returning nothing through PostgREST. Granting explicitly removes the guess.
grant select, update on public.profiles to authenticated;

-- Create the profile with the account, not on first login.
--
-- Doing it in the app means every read has to cope with the row not existing
-- yet, and a signup that fails halfway leaves an account with no profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at honest without asking the app to remember.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
