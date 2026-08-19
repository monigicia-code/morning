import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { HeartHandshake, MessagesSquare, Coffee, Share2, Users } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { PostCard } from '@/components/PostCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/StateViews';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Post } from '@/types/database';
import { AlertTriangle } from 'lucide-react-native';

type FeedTab = 'recommended' | 'latest' | 'saved' | 'mine';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const [feed, setFeed] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>('recommended');

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('posts')
        .select(
          `*, anonymous_identity:anonymous_identities(*), category:help_categories(*)`
        )
        .eq('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(30);

      if (activeTab === 'mine') {
        query = query.eq('author_id', user!.id);
      } else if (activeTab === 'saved') {
        const { data: bookmarked } = await supabase
          .from('bookmarks')
          .select('post_id')
          .eq('user_id', user!.id);
        const ids = (bookmarked ?? []).map((b) => b.post_id);
        if (ids.length === 0) {
          setFeed([]);
          setLoading(false);
          return;
        }
        query = query.in('id', ids);
      }

      const { data, error: e } = await query;
      if (e) throw e;
      const posts = (data ?? []) as unknown as Post[];

      // Fetch the user's reactions + bookmarks for these posts
      if (posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        const [reactionsRes, bookmarksRes] = await Promise.all([
          supabase.from('reactions').select('post_id').in('post_id', postIds).eq('user_id', user!.id),
          supabase.from('bookmarks').select('post_id').in('post_id', postIds).eq('user_id', user!.id),
        ]);
        const reactedIds = new Set((reactionsRes.data ?? []).map((r) => r.post_id));
        const bookmarkedIds = new Set((bookmarksRes.data ?? []).map((b) => b.post_id));
        posts.forEach((p) => {
          p.author_reacted = reactedIds.has(p.id);
          p.author_bookmarked = bookmarkedIds.has(p.id);
        });
      }

      setFeed(posts);
    } catch (e: any) {
      setError(e?.message ?? t('home.feed.error'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, user, t]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleHelpful = async (post: Post) => {
    if (post.author_reacted) {
      await supabase.from('reactions').delete().eq('post_id', post.id).eq('user_id', user!.id);
    } else {
      await supabase.from('reactions').insert({ post_id: post.id, user_id: user!.id });
    }
    loadFeed();
  };

  const handleSave = async (post: Post) => {
    if (post.author_bookmarked) {
      await supabase.from('bookmarks').delete().eq('post_id', post.id).eq('user_id', user!.id);
    } else {
      await supabase.from('bookmarks').insert({ post_id: post.id, user_id: user!.id });
    }
    loadFeed();
  };

  const quickActions = [
    { key: 'needHelp', icon: HeartHandshake, href: '/create?type=help' },
    { key: 'wantHelp', icon: MessagesSquare, href: '/create?type=offer' },
    { key: 'wantTalk', icon: Coffee, href: '/create?type=talk' },
    { key: 'wantShare', icon: Share2, href: '/create?type=share' },
    { key: 'findPeople', icon: Users, href: '/discover' },
  ];

  const feedTabs: { key: FeedTab; label: string }[] = [
    { key: 'recommended', label: t('home.feed.recommended') },
    { key: 'latest', label: t('home.feed.latest') },
    { key: 'saved', label: t('home.feed.saved') },
    { key: 'mine', label: t('home.feed.myPosts') },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={loading && !error} onRefresh={loadFeed} tintColor={theme.brand} />}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <ThemedText variant="h1">{t('home.greeting')}</ThemedText>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, gap: 10 }}>
          {quickActions.map((action) => (
            <Pressable
              key={action.key}
              onPress={() => router.push(action.href as any)}
              style={[styles.quickAction, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            >
              <action.icon size={20} color={theme.brand} />
              <ThemedText variant="caption" style={{ marginTop: 6 }}>
                {t(`home.${action.key}` as any)}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        <View style={[styles.fraudBanner, { backgroundColor: theme.warningBg, marginHorizontal: 20, marginTop: 16 }]}>
          <AlertTriangle size={16} color={theme.warning} />
          <ThemedText variant="caption" color="secondary" style={{ flex: 1, marginLeft: 8 }}>
            {t('create.fraud.banner')}
          </ThemedText>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
          <ThemedText variant="h2">{t('home.feed')}</ThemedText>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginBottom: 12 }}>
          {feedTabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.feedTab,
                {
                  backgroundColor: activeTab === tab.key ? theme.brand : theme.bgSubtle,
                },
              ]}
            >
              <ThemedText
                variant="label"
                color={activeTab === tab.key ? 'inverse' : 'secondary'}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {loading && feed.length === 0 ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={loadFeed} />
        ) : feed.length === 0 ? (
          <EmptyState message={activeTab === 'saved' ? t('profile.saved.empty') : t('home.feed.empty')} />
        ) : (
          <View style={{ paddingHorizontal: 20, paddingBottom: 100 }}>
            {feed.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onHelpful={handleHelpful}
                onSave={handleSave}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  quickAction: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 84,
  },
  fraudBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  feedTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
});
