-- Chamber122 Core Production Schema Migration
-- This migration creates the core tables for MSME accounts, events, bulletins, and analytics

-- Core MSME accounts table
CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending','approved','rejected','suspended')) DEFAULT 'pending',
  name text NOT NULL,
  logo_url text,
  cover_url text,
  category text,
  tags text[] DEFAULT '{}',
  phone text,
  whatsapp text,
  email text,
  website text,
  country text DEFAULT 'Kuwait',
  city text,
  address text,
  about_short text,
  about_full text,
  gallery_urls text[] DEFAULT '{}',
  business_hours jsonb DEFAULT '{}',
  social jsonb DEFAULT '{}',
  plan text CHECK (plan IN ('free','pro','enterprise')) DEFAULT 'free',
  profile_completeness int DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Events table
CREATE TABLE events (
  id bigserial PRIMARY KEY,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  image_url text,
  status text CHECK (status IN ('published','draft','pending','archived')) DEFAULT 'draft',
  views_count int DEFAULT 0,
  likes_count int DEFAULT 0,
  shares_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bulletins table
CREATE TABLE bulletins (
  id bigserial PRIMARY KEY,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  status text CHECK (status IN ('published','draft','pending','archived')) DEFAULT 'draft',
  views_count int DEFAULT 0,
  likes_count int DEFAULT 0,
  shares_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Analytics table
CREATE TABLE content_views (
  id bigserial PRIMARY KEY,
  content_type text CHECK (content_type IN ('event','bulletin')),
  content_id bigint NOT NULL,
  account_id uuid REFERENCES accounts(id),
  viewer_fingerprint text,
  referrer text,
  created_at timestamptz DEFAULT now()
);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_views_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content_type = 'event' THEN
    UPDATE events SET views_count = views_count + 1 WHERE id = NEW.content_id;
  ELSIF NEW.content_type = 'bulletin' THEN
    UPDATE bulletins SET views_count = views_count + 1 WHERE id = NEW.content_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bulletins_updated_at BEFORE UPDATE ON bulletins FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER content_views_increment AFTER INSERT ON content_views FOR EACH ROW EXECUTE FUNCTION increment_views_count();

-- RLS Policies
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_views ENABLE ROW LEVEL SECURITY;

-- Accounts RLS
CREATE POLICY "accounts_owner_select" ON accounts FOR SELECT USING (auth.uid() = owner_user_id);
CREATE POLICY "accounts_owner_update" ON accounts FOR UPDATE USING (auth.uid() = owner_user_id);
CREATE POLICY "accounts_public_select" ON accounts FOR SELECT USING (status = 'approved');

-- Events RLS
CREATE POLICY "events_owner_all" ON events FOR ALL USING (auth.uid() = (SELECT owner_user_id FROM accounts WHERE id = account_id));
CREATE POLICY "events_public_select" ON events FOR SELECT USING (status = 'published');

-- Bulletins RLS
CREATE POLICY "bulletins_owner_all" ON bulletins FOR ALL USING (auth.uid() = (SELECT owner_user_id FROM accounts WHERE id = account_id));
CREATE POLICY "bulletins_public_select" ON bulletins FOR SELECT USING (status = 'published');

-- Content views RLS
CREATE POLICY "content_views_insert" ON content_views FOR INSERT WITH CHECK (true);
