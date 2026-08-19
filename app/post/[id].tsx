import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Heart, Bookmark, Share2, Flag, MessageSquare, Trash2, MoreHorizontal, Send } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedInput } from '@/components/ThemedInput';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingState, ErrorState, EmptyState } from '@/components/StateViews';
import { ReportModal } from '@/components/ReportModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useTimeAgo, formatCount } from '@/utils';
import { localizedCategoryName } from '@/i18n/I18nContext';
import type { Post, Comment } from '@/types/database';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const { identity } = useProfile();
  const timeAgo = useTimeAgo();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: postData, error: pe } = await supabase
        .from('posts')
        .select(`*, anonymous_identity:anonymous_identities(*), category:help_categories(*)`)
        .eq('id', id)
        .maybeSingle();
      if (pe) throw pe;
      if (!postData) {
        setError(t('common.error'));
        setLoading(false);
        return;
      }
      const p = postData as unknown as Post;

      if (user) {
        const [r, b] = await Promise.all([
          supabase.from('reactions').select('post_id').eq('post_id', id).eq('user_id', user.id).maybeSingle(),
          supabase.from('bookmarks').select('post_id').eq('post_id', id).eq('user_id', user.id).maybeSingle(),
        ]);
        p.author_reacted = !!r.data;
        p.author_bookmarked = !!b.data;
      }
      setPost(p);

      const { data: commentsData, error: ce } = await supabase
        .from('comments')
        .select(`*, anonymous_identity:anonymous_identities(*)`)
        .eq('post_id', id)
        .eq('deleted_at', null)
        .order('created_at', { ascending: true });
      if (ce) throw ce;
      const allComments = (commentsData ?? []) as unknown as Comment[];
      const topLevel = allComments.filter((c) => !c.parent_comment_id);
      const replies = allComments.filter((c) => c.parent_comment_id);
      topLevel.forEach((c) => {
        c.replies = replies.filter((r) => r.parent_comment_id === c.id);
      });
      setComments(topLevel);
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [id, user, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleHelpful = async () => {
    if (!post || !user) return;
    if (post.author_reacted) {
      await supabase.from('reactions').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('reactions').insert({ post_id: post.id, user_id: user.id });
    }
    load();
  };

  const handleSave = async () => {
    if (!post || !user) return;
    if (post.author_bookmarked) {
      await supabase.from('bookmarks').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else {
      await supabase.from('bookmarks').insert({ post_id: post.id, user_id: user.id });
    }
    load();
  };

  const submitComment = async () => {
    if (!commentBody.trim() || !user || !identity || !post) return;
    setSubmittingComment(true);
    const { error: e } = await supabase.from('comments').insert({
      post_id: post.id,
      author_id: user.id,
      anonymous_identity_id: identity.id,
      parent_comment_id: replyTo?.id ?? null,
      body: commentBody.trim(),
    });
    setSubmittingComment(false);
    if (e) {
      Alert.alert(t('common.error'), e.message);
      return;
    }
    setCommentBody('');
    setReplyTo(null);
    load();
  };

  const deletePost = async () => {
    if (!post || !user) return;
    Alert.alert(t('post.deleteConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('posts').update({ deleted_at: new Date().toISOString() }).eq('id', post.id);
          router.back();
        },
      },
    ]);
  };

  const blockAuthor = async () => {
    if (!post || !user) return;
    await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: post.author_id });
    setMenuOpen(false);
    router.back();
  };

  const startMessage = async () => {
    if (!post || !user) return;
    const { data, error: e } = await supabase.rpc('create_conversation', { other_user_id: post.author_id });
    if (e) {
      Alert.alert(t('common.error'), e.message);
      return;
    }
    if (data) router.replace(`/conversation/${data}`);
  };

  if (loading) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}><LoadingState /></SafeAreaView>;
  if (error || !post) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}><ErrorState message={error} onRetry={load} /></SafeAreaView>;

  const isOwn = user?.id === post.author_id;
  const authorName = post.anonymous_identity?.nickname?.trim() || `Kindred #${post.anonymous_identity?.display_code}`;

  const renderComment = (comment: Comment, isReply = false) => {
    const cIsOwn = user?.id === comment.author_id;
    const cAuthorName = comment.anonymous_identity?.nickname?.trim() || `Kindred #${comment.anonymous_identity?.display_code}`;
    return (
      <View key={comment.id} style={{ marginLeft: isReply ? 24 : 0, marginTop: isReply ? 12 : 16 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Avatar identity={comment.anonymous_identity} size={32} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <ThemedText variant="label" numberOfLines={1}>
                {cIsOwn ? t('post.selfAuthor') : cAuthorName}
              </ThemedText>
              <ThemedText variant="caption" color="tertiary">
                {timeAgo(comment.created_at)}
              </ThemedText>
            </View>
            <ThemedText variant="body" style={{ marginTop: 4 }}>
              {comment.body}
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
              {!isReply && post.allow_comments && (
                <Pressable onPress={() => { setReplyTo(comment); setCommentBody(''); }}>
                  <ThemedText variant="caption" color="brand">{t('post.reply')}</ThemedText>
                </Pressable>
              )}
              {!cIsOwn && (
                <Pressable onPress={() => { setReportVisible(true); }}>
                  <ThemedText variant="caption" color="tertiary">{t('post.report')}</ThemedText>
                </Pressable>
              )}
              {cIsOwn && (
                <Pressable onPress={async () => {
                  await supabase.from('comments').update({ deleted_at: new Date().toISOString() }).eq('id', comment.id);
                  load();
                }}>
                  <ThemedText variant="caption" color="tertiary">{t('post.deleteOwnComment')}</ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        </View>
        {comment.replies?.map((r) => renderComment(r, true))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setMenuOpen(!menuOpen)} hitSlop={12}>
          <MoreHorizontal size={24} color={theme.text} />
        </Pressable>
      </View>

      {menuOpen && (
        <View style={[styles.menu, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}>
          {!isOwn && post.allow_messages && (
            <Pressable onPress={startMessage} style={styles.menuItem}>
              <ThemedText variant="body">{t('post.messageAuthor')}</ThemedText>
            </Pressable>
          )}
          {!isOwn && (
            <Pressable onPress={blockAuthor} style={styles.menuItem}>
              <ThemedText variant="body" color="error">{t('post.blockAuthor')}</ThemedText>
            </Pressable>
          )}
          {isOwn && (
            <Pressable onPress={deletePost} style={styles.menuItem}>
              <ThemedText variant="body" color="error">{t('common.delete')}</ThemedText>
            </Pressable>
          )}
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <Avatar identity={post.anonymous_identity} size={40} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="label">{isOwn ? t('post.selfAuthor') : authorName}</ThemedText>
            <ThemedText variant="caption" color="tertiary">
              {timeAgo(post.created_at)}{post.location_region ? ` · ${post.location_region}` : ''}
            </ThemedText>
          </View>
          {post.category && (
            <View style={[styles.categoryPill, { backgroundColor: theme.brandLight }]}>
              <ThemedText style={{ color: theme.brandDark, fontSize: 11, fontFamily: 'Inter-Medium' }}>
                {localizedCategoryName(post.category, locale)}
              </ThemedText>
            </View>
          )}
        </View>

        <ThemedText variant="h1" style={{ marginTop: 14 }}>{post.title}</ThemedText>
        <ThemedText variant="body" color="secondary" style={{ marginTop: 8, lineHeight: 24 }}>
          {post.body}
        </ThemedText>

        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {post.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: theme.bgSubtle }]}>
                <ThemedText variant="caption" color="secondary">#{tag}</ThemedText>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.actionsRow, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
          <Pressable style={styles.actionBtn} onPress={handleHelpful}>
            <Heart size={20} color={post.author_reacted ? theme.error : theme.textSecondary} fill={post.author_reacted ? theme.error : 'none'} />
            <ThemedText variant="caption" color="secondary" style={{ marginLeft: 6 }}>{formatCount(post.helpful_count)}</ThemedText>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={handleSave}>
            <Bookmark size={20} color={post.author_bookmarked ? theme.brand : theme.textSecondary} fill={post.author_bookmarked ? theme.brand : 'none'} />
            <ThemedText variant="caption" color="secondary" style={{ marginLeft: 6 }}>{post.author_bookmarked ? t('post.saved') : t('post.save')}</ThemedText>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => setReportVisible(true)}>
            <Flag size={20} color={theme.textSecondary} />
            <ThemedText variant="caption" color="secondary" style={{ marginLeft: 6 }}>{t('post.report')}</ThemedText>
          </Pressable>
        </View>

        <ThemedText variant="h3" style={{ marginTop: 24, marginBottom: 8 }}>
          {t('post.commentCount', { count: post.comment_count })}
        </ThemedText>

        {post.category?.is_sensitive && (
          <View style={[styles.disclaimer, { backgroundColor: theme.warningBg }]}>
            <ThemedText variant="caption" color="secondary">
              {t('home.sensitiveDisclaimer')}
            </ThemedText>
          </View>
        )}

        {!post.allow_comments ? (
          <ThemedText variant="body" color="tertiary" style={{ marginTop: 16, textAlign: 'center' }}>
            {t('post.commentsOff')}
          </ThemedText>
        ) : comments.length === 0 ? (
          <EmptyState message={t('post.noComments')} style={{ paddingVertical: 24 }} />
        ) : (
          <View style={{ marginTop: 8 }}>
            {comments.map((c) => renderComment(c))}
          </View>
        )}
      </ScrollView>

      {post.allow_comments && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.commentBar, { backgroundColor: theme.bgElevated, borderTopColor: theme.border }]}>
            {replyTo && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 8 }}>
                <ThemedText variant="caption" color="tertiary">{t('post.reply')} → {replyTo.body.slice(0, 30)}</ThemedText>
                <Pressable onPress={() => setReplyTo(null)}>
                  <ThemedText variant="caption" color="brand">{t('common.cancel')}</ThemedText>
                </Pressable>
              </View>
            )}
            <View style={styles.commentInputRow}>
              <ThemedInput
                value={commentBody}
                onChangeText={setCommentBody}
                placeholder={t('post.commentPlaceholder')}
                style={{ flex: 1, minHeight: 44 }}
              />
              <Pressable
                onPress={submitComment}
                disabled={!commentBody.trim() || submittingComment}
                style={[styles.sendBtn, { backgroundColor: commentBody.trim() ? theme.brand : theme.border }]}
              >
                <Send size={18} color={theme.textInverse} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      <ReportModal visible={reportVisible} onClose={() => setReportVisible(false)} targetType="post" targetId={post.id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  menu: { position: 'absolute', top: 56, right: 16, borderRadius: 12, borderWidth: 1, paddingVertical: 8, zIndex: 10, minWidth: 180, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  menuItem: { paddingHorizontal: 16, paddingVertical: 10 },
  categoryPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  actionsRow: { flexDirection: 'row', gap: 24, marginTop: 20, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  disclaimer: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  commentBar: { borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 20 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
