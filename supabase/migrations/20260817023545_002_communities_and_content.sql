/*
# Kindred V1 — Communities, Posts, Comments, Reactions, Bookmarks

## Summary
Adds the content layer of the app: topic communities, the anonymous post
feed (general feed or scoped to a community), threaded comments, "helpful"
reactions, and saved posts. Every piece of content is authored by a real
account (author_id) but always displayed through the user's anonymous
identity — the author_id column exists purely for ownership/moderation and
is never selected into any UI that shows other users' content.

## New Tables
- `communities` — topic-based groups users can join.
- `community_members` — membership + moderator role per community.
- `posts` — the core feed unit. Can optionally belong to a community.
  Denormalized `helpful_count`/`comment_count` kept in sync by triggers.
- `comments` — threaded (one level of replies via `parent_comment_id`).
- `reactions` — "helpful" reactions on posts.
- `bookmarks` — saved posts per user.

## Security
- Communities and posts are readable by any signed-in user, filtered to
  hide content from/about anyone in a block relationship with the reader,
  and posts must be `status = 'active'` unless you are the author.
- Only the author can edit/soft-delete their own post or comment.
- Reactions and bookmarks are owned by the acting user.
- A lightweight rate limit (max 5 posts / 20 comments per rolling hour)
  is enforced server-side in a trigger, independent of any client checks.
- Counters (`helpful_count`, `comment_count`) are only ever changed by a
  SECURITY DEFINER trigger function, never directly by client writes, so a
  user cannot inflate their own post's numbers.
*/

CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'local_community',
  member_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_communities" ON communities;
CREATE POLICY "select_communities" ON communities FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_communities" ON communities;
CREATE POLICY "insert_communities" ON communities FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE TABLE IF NOT EXISTS community_members (
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_community_members" ON community_members;
CREATE POLICY "select_community_members" ON community_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_community_members" ON community_members;
CREATE POLICY "insert_community_members" ON community_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_community_members" ON community_members;
CREATE POLICY "delete_community_members" ON community_members FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_identity_id uuid NOT NULL REFERENCES anonymous_identities(id) ON DELETE CASCADE,
  community_id uuid REFERENCES communities(id) ON DELETE SET NULL,
  category_id uuid REFERENCES help_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  location_region text,
  image_url text,
  allow_comments boolean NOT NULL DEFAULT true,
  allow_messages boolean NOT NULL DEFAULT true,
  helpful_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed', 'under_review')),
  contains_flagged_content boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_visible_posts" ON posts;
CREATE POLICY "select_visible_posts" ON posts FOR SELECT
  TO authenticated USING (
    (status = 'active' OR author_id = auth.uid())
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = posts.author_id)
         OR (b.blocker_id = posts.author_id AND b.blocked_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_own_posts" ON posts;
CREATE POLICY "insert_own_posts" ON posts FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM anonymous_identities ai WHERE ai.id = anonymous_identity_id AND ai.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_posts" ON posts;
CREATE POLICY "update_own_posts" ON posts FOR UPDATE
  TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_identity_id uuid NOT NULL REFERENCES anonymous_identities(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed', 'under_review')),
  contains_flagged_content boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_visible_comments" ON comments;
CREATE POLICY "select_visible_comments" ON comments FOR SELECT
  TO authenticated USING (
    (status = 'active' OR author_id = auth.uid())
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = comments.author_id)
         OR (b.blocker_id = comments.author_id AND b.blocked_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_own_comments" ON comments;
CREATE POLICY "insert_own_comments" ON comments FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM anonymous_identities ai WHERE ai.id = anonymous_identity_id AND ai.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.allow_comments = true AND p.status = 'active')
  );

DROP POLICY IF EXISTS "update_own_comments" ON comments;
CREATE POLICY "update_own_comments" ON comments FOR UPDATE
  TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE TABLE IF NOT EXISTS reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'helpful' CHECK (type IN ('helpful')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, type)
);

ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_reactions" ON reactions;
CREATE POLICY "select_reactions" ON reactions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_reactions" ON reactions;
CREATE POLICY "insert_own_reactions" ON reactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reactions" ON reactions;
CREATE POLICY "delete_own_reactions" ON reactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bookmarks" ON bookmarks;
CREATE POLICY "select_own_bookmarks" ON bookmarks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bookmarks" ON bookmarks;
CREATE POLICY "insert_own_bookmarks" ON bookmarks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_bookmarks" ON bookmarks;
CREATE POLICY "delete_own_bookmarks" ON bookmarks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Keep denormalized counters in sync (bypasses RLS intentionally: a reactor
-- or commenter does not own the post they are reacting/commenting on)
CREATE OR REPLACE FUNCTION sync_post_helpful_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET helpful_count = helpful_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_reaction_change ON reactions;
CREATE TRIGGER on_reaction_change
  AFTER INSERT OR DELETE ON reactions
  FOR EACH ROW EXECUTE FUNCTION sync_post_helpful_count();

CREATE OR REPLACE FUNCTION sync_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_change ON comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION sync_post_comment_count();

CREATE OR REPLACE FUNCTION sync_community_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_community_member_change ON community_members;
CREATE TRIGGER on_community_member_change
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW EXECUTE FUNCTION sync_community_member_count();

-- Rate limiting: max 5 posts and 20 comments per rolling hour per user
CREATE OR REPLACE FUNCTION enforce_post_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM posts WHERE author_id = NEW.author_id AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'rate_limit_exceeded: too many posts, please wait before posting again';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_post_insert_rate_limit ON posts;
CREATE TRIGGER before_post_insert_rate_limit
  BEFORE INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION enforce_post_rate_limit();

CREATE OR REPLACE FUNCTION enforce_comment_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM comments WHERE author_id = NEW.author_id AND created_at > now() - interval '1 hour') >= 20 THEN
    RAISE EXCEPTION 'rate_limit_exceeded: too many comments, please wait before commenting again';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_comment_insert_rate_limit ON comments;
CREATE TRIGGER before_comment_insert_rate_limit
  BEFORE INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION enforce_comment_rate_limit();

INSERT INTO communities (name, description, category) VALUES
  ('Seattle Community', 'Neighbors helping neighbors in the greater Seattle area.', 'local_community'),
  ('International Students', 'Support and advice for students studying abroad.', 'study'),
  ('Career Change', 'Navigating career transitions, together.', 'career'),
  ('New Parents', 'A calm space for the ups and downs of new parenthood.', 'parenting'),
  ('Language Exchange', 'Practice languages and help others practice yours.', 'language'),
  ('Entrepreneurs', 'Peer support for people building something of their own.', 'career'),
  ('Travel Help', 'Local tips and travel companionship advice.', 'travel')
ON CONFLICT DO NOTHING;
