-- Create compatibility view for 'accounts' table
-- This allows existing code to continue working while we transition to 'businesses'
create or replace view public.accounts as
select
  b.id,
  b.owner_id   as owner_user_id,
  b.name,
  b.industry,
  b.country,
  b.is_active,
  b.created_at,
  b.updated_at,
  b.profile_completeness,
  b.logo_url,
  b.cover_url,
  b.gallery_urls,
  b.short_description,
  b.whatsapp,
  b.city,
  b.type,
  b.registration_type,
  b.doc_cr_url,
  b.doc_id_url,
  b.doc_proof_url,
  -- Map is_active to status for compatibility
  case 
    when b.is_active = true then 'approved'
    when b.is_active = false then 'pending'
    else 'pending'
  end as status
from public.businesses b;

-- RLS for views follows underlying table policies; no extra policy needed
-- The view will inherit the RLS policies from the businesses table
