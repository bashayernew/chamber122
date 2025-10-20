-- SUPABASE UPLOAD POLICIES
-- Run this SQL in Supabase SQL Editor to fix upload permissions

-- STORAGE: allow authenticated users to upload to the business-assets bucket
-- (Read is handled by making the bucket public in Storage settings.)

-- Enable RLS on storage.objects if not enabled (Supabase does this by default)
-- alter table storage.objects enable row level security;

drop policy if exists "auth can upload to business-assets" on storage.objects;
create policy "auth can upload to business-assets"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'business-assets');

-- Optional: let the same user update/delete their own objects (only if you need it)
-- drop policy if exists "auth can update business-assets" on storage.objects;
-- create policy "auth can update business-assets"
-- on storage.objects
-- for update using (bucket_id = 'business-assets')
-- with check (bucket_id = 'business-assets');

-- BUSINESS MEDIA: owners can insert/select media rows belonging to their business
-- (Assumes businesses.id = business_media.business_id and businesses.owner_id holds the user id)

-- Enable RLS if not already
-- alter table public.business_media enable row level security;

drop policy if exists "owner insert media" on public.business_media;
create policy "owner insert media"
on public.business_media
for insert
to authenticated
with check (
  exists(
    select 1 from public.businesses b
    where b.id = business_media.business_id
      and b.owner_id = auth.uid()
  )
);

drop policy if exists "owner select media" on public.business_media;
create policy "owner select media"
on public.business_media
for select
to authenticated
using (
  exists(
    select 1 from public.businesses b
    where b.id = business_media.business_id
      and b.owner_id = auth.uid()
  )
);

-- BUSINESSES: owners can update their own row
-- alter table public.businesses enable row level security;

drop policy if exists "owner update business" on public.businesses;
create policy "owner update business"
on public.businesses
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
