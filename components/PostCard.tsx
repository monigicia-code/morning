import { Pressable, View, StyleSheet } from 'react-native';
import { MessageSquare, Heart, Bookmark, MoreHorizontal } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ThemedText } from './ThemedText';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { useTimeAgo, formatCount } from '@/utils';
import { localizedCategoryName } from '@/i18n/I18nContext';
import { useI18n } from '@/i18n/I18nContext';
import type { Post } from '@/types/database';
import { useRouter } from 'expo-router';

interface PostCardProps {
  post: Post;
  onHelpful?: (post: Post) => void;
  onSave?: (post: Post) => void;
  compact?: boolean;
}

export function PostCard({ post, onHelpful, onSave, compact }: PostCardProps) {
  const { theme } = useTheme();
  const timeAgo = useTimeAgo();
  const { locale, t } = useI18n();
  const router = useRouter();
  const identity = post.anonymous_identity;
  const authorCode = identity?.display_code ?? '?????';
  const authorName = identity?.nickname?.trim() || `${t('misc.anonymous')} #${authorCode}`;

  const openPost = () => router.push(`/post/${post.id}`);

  return (
    <Card style={styles.card}>
      <Pressable onPress={openPost} style={styles.pressable}>
        <View style={styles.header}>
          <View style={styles.authorRow}>
            <Avatar identity={identity} size={36} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="label" numberOfLines={1}>
                {authorName}
              </ThemedText>
              <ThemedText variant="caption" color="tertiary">
                {timeAgo(post.created_at)}
                {post.location_region ? ` · ${post.location_region}` : ''}
              </ThemedText>
            </View>
          </View>
          {post.category && (
            <View style={[styles.categoryPill, { backgroundColor: theme.brandLight }]}>
              <ThemedText
                style={{
                  color: theme.brandDark,
                  fontSize: 11,
                  fontFamily: 'Inter-Medium',
                }}
                numberOfLines={1}
              >
                {localizedCategoryName(post.category, locale)}
              </ThemedText>
            </View>
          )}
        </View>

        <ThemedText variant="h3" style={{ marginTop: 10 }} numberOfLines={2}>
          {post.title}
        </ThemedText>
        {!compact && (
          <ThemedText variant="body" color="secondary" style={{ marginTop: 4 }} numberOfLines={3}>
            {post.body}
          </ThemedText>
        )}

        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {post.tags.slice(0, 4).map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: theme.bgSubtle }]}>
                <ThemedText variant="caption" color="secondary">
                  #{tag}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </Pressable>

      <View style={styles.actionsRow}>
        <Pressable
          style={styles.actionBtn}
          onPress={() => onHelpful?.(post)}
          accessibilityRole="button"
          accessibilityLabel={t('post.helpful')}
        >
          <Heart
            size={18}
            color={post.author_reacted ? theme.error : theme.textSecondary}
            fill={post.author_reacted ? theme.error : 'none'}
          />
          <ThemedText variant="caption" color="secondary" style={{ marginLeft: 6 }}>
            {formatCount(post.helpful_count)}
          </ThemedText>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={openPost}
          accessibilityRole="button"
          accessibilityLabel={t('post.comments')}
        >
          <MessageSquare size={18} color={theme.textSecondary} />
          <ThemedText variant="caption" color="secondary" style={{ marginLeft: 6 }}>
            {formatCount(post.comment_count)}
          </ThemedText>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={() => onSave?.(post)}
          accessibilityRole="button"
          accessibilityLabel={t('post.save')}
        >
          <Bookmark
            size={18}
            color={post.author_bookmarked ? theme.brand : theme.textSecondary}
            fill={post.author_bookmarked ? theme.brand : 'none'}
          />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  pressable: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  categoryPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, maxWidth: 130 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  actionsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
});
