-- Combined Authentication Schema
-- Run this in Supabase SQL editor

-- PROFILES: one row per auth user
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  phone text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_touch_profiles_updated') then
    create trigger trg_touch_profiles_updated
    before update on public.profiles
    for each row execute function public.touch_profiles_updated_at();
  end if;
end$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles owner select" on public.profiles;
drop policy if exists "profiles owner upsert" on public.profiles;

create policy "profiles owner select"
on public.profiles for select to authenticated
using (user_id = auth.uid());

create policy "profiles owner upsert"
on public.profiles for insert, update to authenticated
with check (user_id = auth.uid());

-- RPC: check if account already exists by email/phone
create or replace function public.account_exists(_email text, _phone text)
returns json language plpgsql security definer set search_path = public, auth as $$
declare e_exists boolean := false;
declare p_exists boolean := false;
begin
  if _email is not null then
    select exists(select 1 from auth.users u where lower(u.email)=lower(_email))
      into e_exists;
  end if;

  if _phone is not null then
    select exists(
      select 1 from auth.identities i
      where i.provider='phone'
        and ((i.identity_data->>'phone')=_phone or (i.identity_data->>'phone_number')=_phone)
    ) into p_exists;
  end if;

  return json_build_object('email_exists', e_exists, 'phone_exists', p_exists);
end
$$;

grant execute on function public.account_exists(text, text) to anon, authenticated;

