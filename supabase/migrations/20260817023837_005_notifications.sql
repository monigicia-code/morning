/*
# Kindred V1 — Notifications & Notification Preferences

## Summary
Adds an in-app notification feed and per-user notification preferences.
Real push delivery is gated behind a feature flag and requires an EAS build
(see README), but the in-app notification surface is fully functional in V1
and is what the bell icon on the Messages/Home tabs reads from.

## New Tables
- `notifications` — one row per in-app notification (new comment on your
  post, new message, new match, helpful reaction, moderation/safety
  notice, community update). Recipient-scoped; unread flag and read_at.
- `notification_preferences` — per-user on/off toggles for each category.

## Security
- `notifications`: owner-only read + mark-as-read.
- `notification_preferences`: owner-only CRUD.
- A trigger auto-creates a notification when a comment is made on a post
  (the post author gets a "new comment" notification), and when a new
  match request is created (recipient gets a "new match" notification).
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'new_comment', 'new_message', 'new_match', 'helpful_reaction',
    'moderation_notice', 'safety_notice', 'community_update'
  )),
  title text NOT NULL,
  body text,
  target_type text,
  target_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  new_comment boolean NOT NULL DEFAULT true,
  new_message boolean NOT NULL DEFAULT true,
  new_match boolean NOT NULL DEFAULT true,
  helpful_reaction boolean NOT NULL DEFAULT true,
  moderation_notice boolean NOT NULL DEFAULT true,
  safety_notice boolean NOT NULL DEFAULT true,
  community_update boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notification_preferences" ON notification_preferences;
CREATE POLICY "select_own_notification_preferences" ON notification_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notification_preferences" ON notification_preferences;
CREATE POLICY "insert_own_notification_preferences" ON notification_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notification_preferences" ON notification_preferences;
CREATE POLICY "update_own_notification_preferences" ON notification_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create default notification preferences for new users
CREATE OR REPLACE FUNCTION ensure_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_notif_prefs ON auth.users;
CREATE TRIGGER on_auth_user_created_notif_prefs
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION ensure_notification_preferences();

-- Notify post author on new comment (skip if commenting on own post)
CREATE OR REPLACE FUNCTION notify_post_author_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_author uuid;
  post_title text;
  commenter_nick text;
BEGIN
  SELECT author_id, title INTO post_author, post_title FROM posts WHERE id = NEW.post_id;
  IF post_author IS NULL OR post_author = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(nickname, 'Anonymous #' || display_code) INTO commenter_nick
  FROM anonymous_identities WHERE id = NEW.anonymous_identity_id;

  INSERT INTO notifications (user_id, type, title, body, target_type, target_id)
  VALUES (
    post_author, 'new_comment',
    'New comment on your post',
    LEFT(commenter_nick || ' commented on "' || post_title || '"', 280),
    'post', NEW.post_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_created_notify ON comments;
CREATE TRIGGER on_comment_created_notify
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_post_author_on_comment();

-- Notify recipient on new match request
CREATE OR REPLACE FUNCTION notify_recipient_on_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, target_type, target_id)
  VALUES (
    NEW.recipient_id, 'new_match',
    'New connection request',
    'Someone would like to connect and help each other.',
    'match', NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_match_created_notify ON matches;
CREATE TRIGGER on_match_created_notify
  AFTER INSERT ON matches
  FOR EACH ROW EXECUTE FUNCTION notify_recipient_on_match();
