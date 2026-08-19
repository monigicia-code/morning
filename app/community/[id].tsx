import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Users, Plus, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { LoadingState, ErrorState, EmptyState } from '@/components/StateViews';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTimeAgo, formatCount } from '@/utils';
import type { Post, AnonymousIdentity, Community } from '@/types/database';

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const timeAgo = useTimeAgo();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data: comm, error: ce } = await supabase.from('communities').select('*').eq('id', id).maybeSingle();
      if (ce) throw ce;
      setCommunity(comm as Community | null);

      const { data: postsData, error: pe } = await supabase
        .from('posts')
        .select(`*, anonymous_identity:anonymous_identities(*)`)
        .eq('community_id', id)
        .eq('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(30);
      if (pe) throw pe;
      setPosts((postsData ?? []) as unknown as Post[]);

      if (user) {
        const { data: membership } = await supabase.from('community_members').select('community_id').eq('community_id', id).eq('user_id', user.id).maybeSingle();
        setJoined(!!membership);
      }
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [id, user, t]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleJoin = async () => {
    if (!user || !community) return;
    if (joined) {
      await supabase.from('community_members').delete().eq('community_id', community.id).eq('user_id', user.id);
      setJoined(false);
    } else {
      await supabase.from('community_members').insert({ community_id: community.id, user_id: user.id });
      setJoined(true);
    }
  };

  if (loading) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}><LoadingState /></SafeAreaView>;
  if (error || !community) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}><ErrorState message={error} onRetry={load} /></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <ThemedText variant="h2" numberOfLines={1} style={{ flex: 1, marginLeft: 12 }}>{community.name}</ThemedText>
        <Button variant={joined ? 'outline' : 'primary'} size="sm" onPress={toggleJoin}>
          {joined ? t('discover.communities.joined') : t('discover.communities.join')}
        </Button>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.brand} />}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
            <ThemedText variant="body" color="secondary">{community.description}</ThemedText>
            <View style={[styles.statsRow, { marginTop: 12 }]}>
              <View style={styles.stat}>
                <Users size={16} color={theme.textSecondary} />
                <ThemedText variant="caption" color="tertiary" style={{ marginLeft: 6 }}>{t('discover.communities.members', { count: community.member_count })}</ThemedText>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState message={t('home.feed.empty')} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => {
          const name = item.anonymous_identity?.nickname?.trim() || `Kindred #${item.anonymous_identity?.display_code}`;
          return (
            <Pressable onPress={() => router.push(`/post/${item.id}`)} style={{ paddingHorizontal: 20 }}>
              <Card style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Avatar identity={item.anonymous_identity} size={28} />
                  <ThemedText variant="caption" color="tertiary">{name} · {timeAgo(item.created_at)}</ThemedText>
                </View>
                <ThemedText variant="label" numberOfLines={2}>{item.title}</ThemedText>
                <ThemedText variant="bodySmall" color="secondary" numberOfLines={3} style={{ marginTop: 4 }}>{item.body}</ThemedText>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                  <ThemedText variant="caption" color="tertiary">{formatCount(item.helpful_count)} {t('post.helpful')}</ThemedText>
                  <ThemedText variant="caption" color="tertiary">{formatCount(item.comment_count)} {t('post.comments')}</ThemedText>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  statsRow: { flexDirection: 'row', gap: 16 },
  stat: { flexDirection: 'row', alignItems: 'center' },
});
