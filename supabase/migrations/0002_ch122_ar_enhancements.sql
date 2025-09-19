-- Chamber122 AR Enhancements & Profile Completeness Migration
-- This migration adds Arabic support fields and profile completeness calculation

-- Update accounts table with new required fields
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('Company','Individual')) DEFAULT 'Individual';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '{}';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS iban_certificate_url text;

-- Profile completeness function
CREATE OR REPLACE FUNCTION calculate_profile_completeness(account accounts)
RETURNS int AS $$
DECLARE
  score int := 0;
BEGIN
  -- Logo (20 points)
  IF account.logo_url IS NOT NULL AND account.logo_url != '' THEN score := score + 20; END IF;
  
  -- Short description (10 points)
  IF account.about_short IS NOT NULL AND length(trim(account.about_short)) > 10 THEN score := score + 10; END IF;
  
  -- Country + City (10 points)
  IF account.country IS NOT NULL AND account.city IS NOT NULL THEN score := score + 10; END IF;
  
  -- Category (10 points)
  IF account.category IS NOT NULL AND account.category != '' THEN score := score + 10; END IF;
  
  -- Phone verified (15 points) - assume verified if exists
  IF account.phone IS NOT NULL AND account.phone != '' THEN score := score + 15; END IF;
  
  -- Email verified (15 points) - check auth.users.email_confirmed_at
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = account.owner_user_id AND email_confirmed_at IS NOT NULL) 
    THEN score := score + 15; END IF;
  
  -- Optional items (10 points each, max 20)
  IF account.about_full IS NOT NULL AND length(trim(account.about_full)) > 20 THEN score := score + 10; END IF;
  IF account.cover_url IS NOT NULL AND account.cover_url != '' THEN score := score + 10; END IF;
  IF array_length(account.gallery_urls, 1) > 0 THEN score := score + 10; END IF;
  IF account.business_hours IS NOT NULL AND account.business_hours != '{}' THEN score := score + 10; END IF;
  IF account.social IS NOT NULL AND account.social != '{}' THEN score := score + 10; END IF;
  IF account.whatsapp IS NOT NULL AND account.whatsapp != '' THEN score := score + 10; END IF;
  IF account.website IS NOT NULL AND account.website != '' THEN score := score + 10; END IF;
  
  -- Cap at 100
  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update profile completeness
CREATE OR REPLACE FUNCTION update_profile_completeness()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completeness := calculate_profile_completeness(NEW);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS accounts_update_completeness ON accounts;

-- Create new trigger
CREATE TRIGGER accounts_update_completeness 
  BEFORE INSERT OR UPDATE ON accounts 
  FOR EACH ROW EXECUTE FUNCTION update_profile_completeness();

-- Update existing accounts with calculated completeness
UPDATE accounts SET profile_completeness = calculate_profile_completeness(accounts) WHERE profile_completeness = 0;
