export type VerificationStatus =
  | 'not_started'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'needs_review'
  | 'expired';

export type UserRole = 'user' | 'verified' | 'moderator' | 'safety_moderator' | 'admin' | 'super_admin';

export type PostStatus = 'active' | 'removed' | 'under_review';
export type CommentStatus = 'active' | 'removed' | 'under_review';
export type ReportReason =
  | 'harassment' | 'threats' | 'hate' | 'sexual_content' | 'child_safety'
  | 'fraud' | 'scam' | 'impersonation' | 'spam' | 'privacy_violation'
  | 'doxxing' | 'illegal_activity' | 'self_harm_concern' | 'dangerous_advice' | 'other';
export type ReportTargetType = 'post' | 'comment' | 'message' | 'user';
export type MatchStatus = 'pending' | 'accepted' | 'declined';
export type Availability = 'flexible' | 'weekdays' | 'evenings' | 'weekends';
export type HelpRole = 'seeking' | 'offering' | 'both';
export type ThemePreference = 'system' | 'light' | 'dark';
export type Locale = 'en' | 'zh';
export type NotificationType =
  | 'new_comment' | 'new_message' | 'new_match' | 'helpful_reaction'
  | 'moderation_notice' | 'safety_notice' | 'community_update';

export interface Profile {
  id: string;
  locale: Locale;
  theme_preference: ThemePreference;
  age_confirmed: boolean;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  guidelines_accepted_at: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdentityVerification {
  id: string;
  user_id: string;
  status: VerificationStatus;
  provider: string;
  provider_user_id: string | null;
  method: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  result_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AnonymousIdentity {
  id: string;
  user_id: string;
  display_code: string;
  nickname: string | null;
  avatar_seed: string;
  avatar_color: string;
  bio: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Interest {
  id: string;
  key: string;
  name_en: string;
  name_zh: string;
  sort_order: number;
}

export interface HelpCategory {
  id: string;
  key: string;
  name_en: string;
  name_zh: string;
  icon: string;
  is_sensitive: boolean;
  sort_order: number;
}

export interface UserHelpCategory {
  user_id: string;
  category_id: string;
  role: HelpRole;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  category: string;
  member_count: number;
  created_by: string | null;
  created_at: string;
}

export interface CommunityMember {
  community_id: string;
  user_id: string;
  role: 'member' | 'moderator';
  joined_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  anonymous_identity_id: string;
  community_id: string | null;
  category_id: string | null;
  title: string;
  body: string;
  tags: string[];
  location_region: string | null;
  image_url: string | null;
  allow_comments: boolean;
  allow_messages: boolean;
  helpful_count: number;
  comment_count: number;
  status: PostStatus;
  contains_flagged_content: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined fields (optional)
  anonymous_identity?: AnonymousIdentity;
  category?: HelpCategory;
  community?: Community;
  author_reacted?: boolean;
  author_bookmarked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  anonymous_identity_id: string;
  parent_comment_id: string | null;
  body: string;
  status: CommentStatus;
  contains_flagged_content: boolean;
  created_at: string;
  deleted_at: string | null;
  anonymous_identity?: AnonymousIdentity;
  replies?: Comment[];
}

export interface Conversation {
  id: string;
  created_at: string;
  last_message_at: string;
  other_member_user_id?: string;
  other_identity?: AnonymousIdentity;
  last_message_body?: string;
  last_message_at_actual?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface Match {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: MatchStatus;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
  other_identity?: AnonymousIdentity;
}

export interface MatchPreferences {
  user_id: string;
  seeking: string[];
  languages: string[];
  region: string | null;
  availability: Availability;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  target_type: string | null;
  target_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  new_comment: boolean;
  new_message: boolean;
  new_match: boolean;
  helpful_reaction: boolean;
  moderation_notice: boolean;
  safety_notice: boolean;
  community_update: boolean;
  updated_at: string;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked_identity?: AnonymousIdentity;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  description: string | null;
  status: string;
  created_at: string;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
}
