/*
# Kindred V1 — Safety, Reporting & Moderation

## Summary
Adds the trust & safety backbone: muting, reporting, moderation cases,
moderation actions, and an audit log. Every report a user submits
automatically opens a moderation case so nothing is silently dropped, even
though this V1 does not yet ship a full moderator review UI.

## New Tables
- `mutes` — silence another user's content without blocking them outright.
- `reports` — a user-submitted report against a post, comment, message, or
  user, with a required reason and optional free-text description.
- `moderation_cases` — the internal case a report opens; tracks status,
  risk level, and assignment. Not reachable by ordinary users or by
  community moderators — reserved for platform Moderator/Safety
  Moderator/Administrator roles operating through a trusted server context.
- `moderation_actions` — the action history taken against a case (warning,
  content removal, restriction, suspension, ban, escalation, etc).
- `audit_logs` — append-only log of privileged actions.

## Security
- `mutes`/`reports`: owner can create and see their own; reports cannot be
  read, edited, or withdrawn once submitted (mirrors how real trust & safety
  systems avoid letting a bad actor erase evidence).
- `moderation_cases`, `moderation_actions`, and `audit_logs` have RLS
  enabled with NO policies for `anon`/`authenticated`, so they are entirely
  inaccessible from the mobile client — only a service-role context (a
  future admin/moderation surface using the Supabase service key) can read
  or write them. This is the "administrators access privileged data only
  through secure server-side functionality" rule from the product spec.
- A trigger automatically opens a `moderation_cases` row whenever a report
  is submitted.
*/

CREATE TABLE IF NOT EXISTS mutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, muted_user_id),
  CHECK (user_id <> muted_user_id)
);

ALTER TABLE mutes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_mutes" ON mutes;
CREATE POLICY "select_own_mutes" ON mutes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_mutes" ON mutes;
CREATE POLICY "insert_own_mutes" ON mutes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_mutes" ON mutes;
CREATE POLICY "delete_own_mutes" ON mutes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment', 'message', 'user')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN (
    'harassment', 'threats', 'hate', 'sexual_content', 'child_safety', 'fraud', 'scam',
    'impersonation', 'spam', 'privacy_violation', 'doxxing', 'illegal_activity',
    'self_harm_concern', 'dangerous_advice', 'other'
  )),
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reports" ON reports;
CREATE POLICY "select_own_reports" ON reports FOR SELECT
  TO authenticated USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "insert_own_reports" ON reports;
CREATE POLICY "insert_own_reports" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);

CREATE TABLE IF NOT EXISTS moderation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  assigned_moderator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'escalated')),
  risk_level text NOT NULL DEFAULT 'unassessed' CHECK (risk_level IN ('unassessed', 'low', 'medium', 'high', 'critical')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE moderation_cases ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moderation_case_id uuid NOT NULL REFERENCES moderation_cases(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN (
    'no_action', 'warning', 'content_removal', 'temporary_restriction',
    'messaging_restriction', 'account_suspension', 'permanent_ban', 'escalation'
  )),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION open_moderation_case_for_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO moderation_cases (report_id, status, risk_level)
  VALUES (NEW.id, 'open', CASE WHEN NEW.reason IN ('child_safety', 'threats', 'self_harm_concern') THEN 'high' ELSE 'unassessed' END);

  INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
  VALUES (NEW.reporter_id, 'report_submitted', NEW.target_type, NEW.target_id, jsonb_build_object('reason', NEW.reason));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_created ON reports;
CREATE TRIGGER on_report_created
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION open_moderation_case_for_report();
