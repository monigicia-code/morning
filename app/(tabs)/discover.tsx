import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Users, MessageCircle, Search } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { LoadingState, ErrorState, EmptyState } from '@/components/StateViews';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { localizedInterestName } from '@/i18n/I18nContext';
import type { Community, AnonymousIdentity, Interest, Match } from '@/types/database';

export default function DiscoverScreen() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [suggested, setSuggested] = useState<(AnonymousIdentity & { shared_interests: Interest[] })[]>([]);
  const [matchStatuses, setMatchStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [commRes, joinedRes] = await Promise.all([
        supabase.from('communities').select('*').order('member_count', { ascending: false }).limit(20),
        supabase.from('community_members').select('community_id').eq('user_id', user.id),
      ]);
      if (commRes.error) throw commRes.error;
      setCommunities((commRes.data ?? []) as Community[]);
      setJoinedIds(new Set((joinedRes.data ?? []).map((j) => j.community_id)));

      // Suggested people: share interests/help categories, not blocked, not me, not already connected
      const { data: myInterests } = await supabase
        .from('user_interests')
        .select('interest_id')
        .eq('user_id', user.id);
      const myInterestIds = (myInterests ?? []).map((i) => i.interest_id);

      if (myInterestIds.length === 0) {
        setSuggested([]);
        setLoading(false);
        return;
      }

      // Find users who share at least one interest
      const { data: shared } = await supabase
        .from('user_interests')
        .select('user_id, interest_id, interest:interests(*)')
        .in('interest_id', myInterestIds)
        .neq('user_id', user.id)
        .limit(50);

      // Group by user
      const byUser = new Map<string, Interest[]>();
      (shared ?? []).forEach((s: any) => {
        const arr = byUser.get(s.user_id) ?? [];
        arr.push(s.interest as Interest);
        byUser.set(s.user_id, arr);
      });

      const userIds = Array.from(byUser.keys()).slice(0, 10);
      if (userIds.length === 0) {
        setSuggested([]);
        setLoading(false);
        return;
      }

      const { data: identities } = await supabase
        .from('anonymous_identities')
        .select('*')
        .in('user_id', userIds)
        .eq('is_primary', true);

      const suggestedList = ((identities ?? []) as AnonymousIdentity[]).map((ai) => ({
        ...ai,
        shared_interests: byUser.get(ai.user_id) ?? [],
      }));
      setSuggested(suggestedList);

      // Check existing match statuses
      const { data: existingMatches } = await supabase
        .from('matches')
        .select('recipient_id, status')
        .eq('requester_id', user.id)
        .in('recipient_id', userIds);
      const statusMap: Record<string, string> = {};
      (existingMatches ?? []).forEach((m: any) => {
        statusMap[m.recipient_id] = m.status;
      });
      setMatchStatuses(statusMap);
    } catch (e: any) {
      setError(e?.message ?? t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggleJoin = async (community: Community) => {
    if (!user) return;
    if (joinedIds.has(community.id)) {
      await supabase.from('community_members').delete().eq('community_id', community.id).eq('user_id', user.id);
      setJoinedIds((prev) => { const n = new Set(prev); n.delete(community.id); return n; });
    } else {
      await supabase.from('community_members').insert({ community_id: community.id, user_id: user.id });
      setJoinedIds((prev) => new Set(prev).add(community.id));
    }
  };

  const connect = async (otherUserId: string) => {
    if (!user) return;
    const { error } = await supabase.from('matches').insert({ requester_id: user.id, recipient_id: otherUserId });
    if (!error) {
      setMatchStatuses((prev) => ({ ...prev, [otherUserId]: 'pending' }));
    }
  };

  const startMessage = async (otherUserId: string) => {
    const { data, error } = await supabase.rpc('create_conversation', { other_user_id: otherUserId });
    if (data) router.push(`/conversation/${data}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.brand} />}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <ThemedText variant="h1">{t('discover.title')}</ThemedText>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <ThemedText variant="h2">{t('discover.suggested')}</ThemedText>
          <ThemedText variant="body" color="secondary" style={{ marginTop: 4 }}>
            {t('discover.suggested.subtitle')}
          </ThemedText>
        </View>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : suggested.length === 0 ? (
          <EmptyState message={t('discover.suggested.empty')} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
            {suggested.map((person) => {
              const status = matchStatuses[person.user_id];
              const name = person.nickname?.trim() || `Kindred #${person.display_code}`;
              return (
                <Card key={person.id} style={{ width: 220, padding: 16 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Avatar identity={person} size={56} />
                    <ThemedText variant="label" style={{ marginTop: 8 }} numberOfLines={1}>
                      {name}
                    </ThemedText>
                    <ThemedText variant="caption" color="tertiary" numberOfLines={1} style={{ marginTop: 2 }}>
                      {person.bio || `Kindred #${person.display_code}`}
                    </ThemedText>
                  </View>
                  <View style={styles.interestRow}>
                    {person.shared_interests.slice(0, 3).map((interest) => (
                      <View key={interest.id} style={[styles.interestTag, { backgroundColor: theme.brandLight }]}>
                        <ThemedText variant="caption" color="brand">
                          {localizedInterestName(interest, locale)}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                  {status === 'accepted' ? (
                    <Button variant="secondary" size="sm" fullWidth onPress={() => startMessage(person.user_id)}>
                      {t('discover.message')}
                    </Button>
                  ) : status === 'pending' ? (
                    <Button variant="outline" size="sm" fullWidth disabled>
                      {t('discover.connect.pending')}
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" fullWidth onPress={() => connect(person.user_id)}>
                      {t('discover.connect')}
                    </Button>
                  )}
                </Card>
              );
            })}
          </ScrollView>
        )}

        <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
          <ThemedText variant="h2">{t('discover.communities')}</ThemedText>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100, gap: 12 }}>
          {communities.map((community) => (
            <Card key={community.id}>
              <Pressable onPress={() => router.push(`/community/${community.id}`)}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="h3">{community.name}</ThemedText>
                    <ThemedText variant="bodySmall" color="secondary" style={{ marginTop: 4 }} numberOfLines={2}>
                      {community.description}
                    </ThemedText>
                    <ThemedText variant="caption" color="tertiary" style={{ marginTop: 8 }}>
                      {t('discover.communities.members', { count: community.member_count })}
                    </ThemedText>
                  </View>
                  <Button
                    variant={joinedIds.has(community.id) ? 'outline' : 'primary'}
                    size="sm"
                    onPress={() => toggleJoin(community)}
                  >
                    {joinedIds.has(community.id) ? t('discover.communities.joined') : t('discover.communities.join')}
                  </Button>
                </View>
              </Pressable>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  interestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginVertical: 12 },
  interestTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
});
