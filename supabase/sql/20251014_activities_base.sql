-- Migration: Add missing columns to activities_base for event creation
-- Date: 2025-10-14
-- Purpose: Fix PGRST204 error by adding kind, status, is_published columns

-- If activities_base is a TABLE, add the missing columns
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'activities_base') then

    -- kind: what type of activity (event/bulletin)
    alter table public.activities_base
      add column if not exists kind text check (kind in ('event','bulletin')) default 'event' not null;

    -- status: workflow state
    alter table public.activities_base
      add column if not exists status text check (status in ('draft','pending','published')) default 'draft' not null;

    -- is_published: quick boolean for public filters
    alter table public.activities_base
      add column if not exists is_published boolean default false not null;

    -- Add indexes for better performance
    create index if not exists idx_activities_base_kind on public.activities_base(kind);
    create index if not exists idx_activities_base_status on public.activities_base(status);
    create index if not exists idx_activities_base_is_published on public.activities_base(is_published);

  end if;
end$$;

-- If activities_base is actually a VIEW, (re)create it with the needed columns.
-- Uncomment and adjust the SELECT to match your base table name (e.g., events)
-- drop view if exists public.activities_base;
-- create view public.activities_base as
-- select
--   e.id,
--   e.business_id,
--   e.title,
--   e.description,
--   e.location,
--   e.start_at,
--   e.end_at,
--   e.contact_name,
--   e.contact_email,
--   e.contact_phone,
--   e.link,
--   e.cover_image_url,
--   coalesce(e.kind, 'event') as kind,
--   coalesce(e.status, 'draft') as status,
--   coalesce(e.is_published, false) as is_published,
--   e.created_at
-- from public.events e;

-- (Re)apply RLS to the underlying TABLE (not the view) if needed
-- Example policy for events table:
-- alter table public.events enable row level security;
-- drop policy if exists "owner can manage events" on public.events;
-- create policy "owner can manage events"
-- on public.events
-- for all
-- to authenticated
-- using (business_id in (select id from public.businesses where owner_id = auth.uid()))
-- with check (business_id in (select id from public.businesses where owner_id = auth.uid()));

-- Ask PostgREST to reload schema cache so new columns appear immediately
notify pgrst, 'reload schema';

-- Verify the changes
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'activities_base'
and column_name in ('kind', 'status', 'is_published')
order by column_name;
