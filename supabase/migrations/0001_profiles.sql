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
create policy "profiles are readable by their owner"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "profiles are updatable by their owner"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No insert policy on purpose: rows arrive from the trigger below, which runs
-- as the definer. A client that could insert its own profile could insert one
-- against somebody else's id.

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
