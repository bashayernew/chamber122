-- Ensure the ownership column exists and is unique so upsert works
alter table public.businesses
  add column if not exists owner_id uuid not null default auth.uid();

-- make it unique so upsert({ onConflict: 'owner_id' }) does what we expect
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'businesses_owner_id_key'
      and conrelid = 'public.businesses'::regclass
  ) then
    alter table public.businesses
      add constraint businesses_owner_id_key unique (owner_id);
  end if;
end$$;

-- Enable RLS and let users see/edit their own business
alter table public.businesses enable row level security;

-- Read: owners can read their own row
create policy if not exists "users can read own business"
on public.businesses
for select
to authenticated
using (owner_id = auth.uid());

-- Insert: owners can create their row
create policy if not exists "users can insert own business"
on public.businesses
for insert
to authenticated
with check (owner_id = auth.uid());

-- Update: owners can edit their row
create policy if not exists "users can update own business"
on public.businesses
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
