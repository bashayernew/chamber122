-- Activities Ownership Migration
-- Updates activities table to work with businesses table and improves RLS

-- 1.1 Update foreign key reference from accounts to businesses
-- First, we need to check if we can safely update the reference
-- This assumes activities.business_id should reference businesses.id instead of accounts.id
alter table public.activities
  drop constraint if exists activities_business_id_fkey;

alter table public.activities
  add constraint activities_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete cascade;

-- 1.2 Backfill created_by from businesses.owner_id (using the accounts view for compatibility)
update public.activities a
set created_by = b.owner_user_id
from public.accounts b
where a.business_id = b.id
  and a.created_by is null;

-- 1.3 Indexes for performance
create index if not exists idx_activities_created_by on public.activities(created_by);
create index if not exists idx_activities_created_at on public.activities(created_at);

-- 1.4 Helper function: admin checker
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable as
$$
  select exists (select 1 from public.admins where user_id = uid);
$$;
grant execute on function public.is_admin(uuid) to anon, authenticated;

-- 1.5 Trigger function to auto-populate created_by from business owner
create or replace function public.set_activity_owner()
returns trigger language plpgsql as
$$
declare v_owner uuid;
begin
  -- If created_by already provided, keep it; else derive from business_id
  if new.created_by is null then
    -- Try to get owner from businesses table first, fallback to accounts view
    select owner_id into v_owner from public.businesses where id = new.business_id;
    if v_owner is null then
      select owner_user_id into v_owner from public.accounts where id = new.business_id;
    end if;
    new.created_by := v_owner;
  end if;

  -- Ensure created_at has a value
  if new.created_at is null then
    new.created_at := now();
  end if;

  return new;
end;
$$;

-- 1.6 Triggers
drop trigger if exists trg_activities_set_owner_ins on public.activities;
create trigger trg_activities_set_owner_ins
before insert on public.activities
for each row execute function public.set_activity_owner();

drop trigger if exists trg_activities_set_owner_upd on public.activities;
create trigger trg_activities_set_owner_upd
before update on public.activities
for each row execute function public.set_activity_owner();

-- 1.7 RLS Policies
alter table public.activities enable row level security;

-- Clear old policies for a clean slate
drop policy if exists "owner read activities" on public.activities;
drop policy if exists "owner write activities" on public.activities;
drop policy if exists "admin read activities" on public.activities;
drop policy if exists "owner or admin read activities" on public.activities;
drop policy if exists "owner insert activities" on public.activities;
drop policy if exists "owner update activities" on public.activities;

-- Owners can read their activities; admins can read all
create policy "owner or admin read activities"
on public.activities
for select
to authenticated
using (
  created_by = auth.uid() OR public.is_admin(auth.uid())
);

-- Owners can insert rows only if created_by resolves to them
create policy "owner insert activities"
on public.activities
for insert
to authenticated
with check (
  -- allow if explicitly set to self OR derives from a business they own
  created_by = auth.uid()
  OR exists (
    select 1 from public.businesses b
    where b.id = coalesce(new.business_id, public.activities.business_id)
      and b.owner_id = auth.uid()
  )
  OR exists (
    select 1 from public.accounts a
    where a.id = coalesce(new.business_id, public.activities.business_id)
      and a.owner_user_id = auth.uid()
  )
);

-- Owners can update rows they own; admins can update via service if needed
create policy "owner update activities"
on public.activities
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- 1.8 Grant necessary permissions
grant select, insert, update on public.activities to authenticated;
grant usage on sequence public.activities_id_seq to authenticated;
