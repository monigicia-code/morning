/*
# Kindred V1 — Identity, Verification & Reference Data

## Summary
Sets up the foundation of the "private identity, public anonymity" model:
every signed-in user gets a private `profiles` row (account-level settings),
an `identity_verifications` row (tracks a real-world verification status but
never stores documents), and a public-facing `anonymous_identities` row
(the only identity other users ever see). Also creates a minimal `blocks`
table (fully expanded with mutes/reports in a later migration) so identity
visibility can respect blocking from the start, plus shared lookup tables
(interests, help categories) and a `feature_flags` table used to hide
unfinished/unconfigured features (payments, professional verification) until
they are really wired up.

## New Tables
- `profiles` — private account settings. One row per user (id = auth.users.id).
- `identity_verifications` — tracks verification status
  (not_started/pending/verified/rejected/needs_review/expired). No document
  storage. Status can only move to "verified"/"rejected" from a trusted
  server context, never directly by the client.
- `anonymous_identities` — the public identity shown to everyone else.
- `blocks` — records one user blocking another.
- `interests` / `help_categories` — shared lookup tables (bilingual labels).
- `user_interests` / `user_help_categories` — join tables for selections.
- `feature_flags` — on/off switches so unfinished features stay hidden.

## Security
- RLS enabled on every table.
- `profiles` / `identity_verifications`: owner-only, and verification status
  has no client update path to "verified"/"rejected".
- `anonymous_identities`: readable by all signed-in users except rows
  belonging to someone in a block relationship with the requester.
- A trigger auto-creates profile + verification + starter anonymous identity
  on signup.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  locale text NOT NULL DEFAULT 'en',
  theme_preference text NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('system', 'light', 'dark')),
  age_confirmed boolean NOT NULL DEFAULT false,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  guidelines_accepted_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'pending', 'verified', 'rejected', 'needs_review', 'expired')),
  provider text NOT NULL DEFAULT 'not_configured',
  provider_user_id text,
  method text,
  submitted_at timestamptz,
  decided_at timestamptz,
  result_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_verification" ON identity_verifications;
CREATE POLICY "select_own_verification" ON identity_verifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "request_own_verification" ON identity_verifications;
CREATE POLICY "request_own_verification" ON identity_verifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status IN ('not_started', 'rejected', 'expired'))
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_blocks" ON blocks;
CREATE POLICY "select_own_blocks" ON blocks FOR SELECT
  TO authenticated USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "insert_own_blocks" ON blocks;
CREATE POLICY "insert_own_blocks" ON blocks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "delete_own_blocks" ON blocks;
CREATE POLICY "delete_own_blocks" ON blocks FOR DELETE
  TO authenticated USING (auth.uid() = blocker_id);

CREATE TABLE IF NOT EXISTS anonymous_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_code text NOT NULL UNIQUE,
  nickname text,
  avatar_seed text NOT NULL DEFAULT gen_random_uuid()::text,
  avatar_color text NOT NULL DEFAULT '#3B7A6E',
  bio text NOT NULL DEFAULT '',
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anonymous_identities_user_id ON anonymous_identities(user_id);

ALTER TABLE anonymous_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_visible_identities" ON anonymous_identities;
CREATE POLICY "select_visible_identities" ON anonymous_identities FOR SELECT
  TO authenticated USING (
    NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = anonymous_identities.user_id)
         OR (b.blocker_id = anonymous_identities.user_id AND b.blocked_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_own_identity" ON anonymous_identities;
CREATE POLICY "update_own_identity" ON anonymous_identities FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_zh text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_interests" ON interests;
CREATE POLICY "select_interests" ON interests FOR SELECT
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS help_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_zh text NOT NULL,
  icon text NOT NULL DEFAULT 'circle',
  is_sensitive boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_help_categories" ON help_categories;
CREATE POLICY "select_help_categories" ON help_categories FOR SELECT
  TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS user_interests (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id uuid NOT NULL REFERENCES interests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, interest_id)
);

ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_interests" ON user_interests;
CREATE POLICY "select_own_interests" ON user_interests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_interests" ON user_interests;
CREATE POLICY "insert_own_interests" ON user_interests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_interests" ON user_interests;
CREATE POLICY "delete_own_interests" ON user_interests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_help_categories (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES help_categories(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'both' CHECK (role IN ('seeking', 'offering', 'both')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category_id)
);

ALTER TABLE user_help_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_help_categories" ON user_help_categories;
CREATE POLICY "select_own_help_categories" ON user_help_categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_help_categories" ON user_help_categories;
CREATE POLICY "insert_own_help_categories" ON user_help_categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_help_categories" ON user_help_categories;
CREATE POLICY "delete_own_help_categories" ON user_help_categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT ''
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_feature_flags" ON feature_flags;
CREATE POLICY "select_feature_flags" ON feature_flags FOR SELECT
  TO authenticated USING (true);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  INSERT INTO identity_verifications (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

  LOOP
    new_code := 'A' || lpad(floor(random() * 99999)::text, 5, '0');
    BEGIN
      INSERT INTO anonymous_identities (user_id, display_code)
      VALUES (NEW.id, new_code);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- retry with a new random code
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

INSERT INTO interests (key, name_en, name_zh, sort_order) VALUES
  ('reading', 'Reading', '阅读', 1),
  ('fitness', 'Fitness', '健身', 2),
  ('cooking', 'Cooking', '烹饪', 3),
  ('music', 'Music', '音乐', 4),
  ('travel', 'Travel', '旅行', 5),
  ('gaming', 'Gaming', '游戏', 6),
  ('art', 'Art & Design', '艺术设计', 7),
  ('technology', 'Technology', '科技', 8),
  ('outdoors', 'Outdoors', '户外', 9),
  ('pets', 'Pets', '宠物', 10),
  ('meditation', 'Meditation', '冥想', 11),
  ('writing', 'Writing', '写作', 12)
ON CONFLICT (key) DO NOTHING;

INSERT INTO help_categories (key, name_en, name_zh, icon, is_sensitive, sort_order) VALUES
  ('emotional_support', 'Emotional Support', '情感支持', 'heart-handshake', true, 1),
  ('life_advice', 'Life Advice', '生活建议', 'compass', false, 2),
  ('relationships', 'Relationships', '人际关系', 'users', false, 3),
  ('career', 'Career', '职业发展', 'briefcase', false, 4),
  ('study', 'Study', '学习', 'graduation-cap', false, 5),
  ('finance', 'Finance', '财务', 'wallet', false, 6),
  ('technology', 'Technology', '科技', 'laptop', false, 7),
  ('travel', 'Travel', '旅行', 'map', false, 8),
  ('parenting', 'Parenting', '育儿', 'baby', false, 9),
  ('language', 'Language', '语言', 'languages', false, 10),
  ('immigration', 'Immigration', '移民', 'plane', false, 11),
  ('housing', 'Housing', '住房', 'home', false, 12),
  ('local_community', 'Local Community', '本地社区', 'map-pin', false, 13),
  ('everyday_life', 'Everyday Life', '日常生活', 'sun', false, 14),
  ('other', 'Other', '其他', 'more-horizontal', false, 15)
ON CONFLICT (key) DO NOTHING;

INSERT INTO feature_flags (key, enabled, description) VALUES
  ('professional_verification', false, 'Verified professional badges — requires manual credential review process'),
  ('monetization', false, 'Premium membership and paid features — requires payment provider configuration'),
  ('google_sign_in', false, 'Sign in with Google — requires OAuth provider configuration'),
  ('apple_sign_in', false, 'Sign in with Apple — requires OAuth provider configuration'),
  ('push_notifications', false, 'Push notifications — requires an EAS development/production build')
ON CONFLICT (key) DO NOTHING;
