/*
# Kindred V1 — Private Messaging & Mutual-Help Matching

## Summary
Adds one-to-one anonymous messaging and a mutual-help matching layer.
Conversations are always created through a `create_conversation` function
rather than direct inserts, so the block relationship is checked atomically
and a user can never be added to a conversation by someone else without
that check. Matching preferences (what a user is seeking/offering, language,
region, availability) drive a "Suggested People" feature computed live from
shared interests/help categories rather than a black-box score, and a
lightweight connection-request flow (`matches`) lets two people agree to
talk before a conversation is created.

## New Tables
- `conversations` / `conversation_members` / `messages` — anonymous 1:1
  messaging. Only members of a conversation can read it.
- `match_preferences` — what a user is looking for (seeking help / offering
  help / just talking), languages, region, availability.
- `matches` — a connection request between two users (pending/accepted/
  declined), the record that a "suggested people" interaction turned into
  an actual mutual interest.

## Security
- `conversations`/`conversation_members`/`messages`: only visible to
  members of that conversation. There is no direct client INSERT policy on
  `conversations`/`conversation_members` — creation only happens through
  the `create_conversation` SECURITY DEFINER function, which checks blocks
  first.
- `messages` insert requires the sender to be a member of the conversation
  and requires neither party has blocked the other; rate-limited to 30
  messages per rolling 5 minutes per user.
- `match_preferences`/`matches`: owner- or participant-scoped.
*/

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_member_conversations" ON conversations;
CREATE POLICY "select_member_conversations" ON conversations FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversations.id AND cm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "select_own_membership" ON conversation_members;
CREATE POLICY "select_own_membership" ON conversation_members FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversation_members cm2 WHERE cm2.conversation_id = conversation_members.conversation_id AND cm2.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_membership" ON conversation_members;
CREATE POLICY "update_own_membership" ON conversation_members FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_conversation_messages" ON messages;
CREATE POLICY "select_conversation_messages" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_conversation_messages" ON messages;
CREATE POLICY "insert_conversation_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = messages.conversation_id AND cm.user_id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM conversation_members other
      JOIN blocks b ON (b.blocker_id = other.user_id AND b.blocked_id = auth.uid())
                    OR (b.blocker_id = auth.uid() AND b.blocked_id = other.user_id)
      WHERE other.conversation_id = messages.conversation_id AND other.user_id <> auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_messages" ON messages;
CREATE POLICY "update_own_messages" ON messages FOR UPDATE
  TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

CREATE OR REPLACE FUNCTION enforce_message_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM messages WHERE sender_id = NEW.sender_id AND created_at > now() - interval '5 minutes') >= 30 THEN
    RAISE EXCEPTION 'rate_limit_exceeded: too many messages, please slow down';
  END IF;
  UPDATE conversations SET last_message_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_message_insert_rate_limit ON messages;
CREATE TRIGGER before_message_insert_rate_limit
  BEFORE INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION enforce_message_rate_limit();

CREATE TABLE IF NOT EXISTS match_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  seeking text[] NOT NULL DEFAULT '{}',
  languages text[] NOT NULL DEFAULT '{"en"}',
  region text,
  availability text NOT NULL DEFAULT 'flexible' CHECK (availability IN ('flexible', 'weekdays', 'evenings', 'weekends')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE match_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_match_preferences" ON match_preferences;
CREATE POLICY "select_own_match_preferences" ON match_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_match_preferences" ON match_preferences;
CREATE POLICY "insert_own_match_preferences" ON match_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_match_preferences" ON match_preferences;
CREATE POLICY "update_own_match_preferences" ON match_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, recipient_id),
  CHECK (requester_id <> recipient_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_matches" ON matches;
CREATE POLICY "select_own_matches" ON matches FOR SELECT
  TO authenticated USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "insert_own_matches" ON matches;
CREATE POLICY "insert_own_matches" ON matches FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = requester_id
    AND NOT EXISTS (
      SELECT 1 FROM blocks b WHERE (b.blocker_id = auth.uid() AND b.blocked_id = recipient_id)
                                 OR (b.blocker_id = recipient_id AND b.blocked_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "update_participant_matches" ON matches;
CREATE POLICY "update_participant_matches" ON matches FOR UPDATE
  TO authenticated USING (auth.uid() = requester_id OR auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Atomically create (or reuse) a 1:1 conversation, checking blocks first
CREATE OR REPLACE FUNCTION create_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
BEGIN
  IF other_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_message_self';
  END IF;

  IF EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = auth.uid() AND blocked_id = other_user_id)
       OR (blocker_id = other_user_id AND blocked_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'blocked_relationship';
  END IF;

  SELECT cm1.conversation_id INTO existing_id
  FROM conversation_members cm1
  JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
  WHERE cm1.user_id = auth.uid() AND cm2.user_id = other_user_id
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  INSERT INTO conversations DEFAULT VALUES RETURNING id INTO new_id;
  INSERT INTO conversation_members (conversation_id, user_id) VALUES (new_id, auth.uid()), (new_id, other_user_id);

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION create_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_conversation(uuid) TO authenticated;
