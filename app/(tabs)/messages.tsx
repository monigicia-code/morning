import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { LoadingState, ErrorState, EmptyState } from '@/components/StateViews';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTimeAgo } from '@/utils';
import type { Conversation, AnonymousIdentity, Message } from '@/types/database';

export default function MessagesScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const timeAgo = useTimeAgo();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data: memberships, error: me } = await supabase
        .from('conversation_members')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);
      if (me) throw me;
      if (!memberships || memberships.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = memberships.map((m) => m.conversation_id);
      const lastReadMap = new Map(memberships.map((m) => [m.conversation_id, m.last_read_at]));

      const [convRes, otherMembersRes] = await Promise.all([
        supabase.from('conversations').select('*').in('id', convIds).order('last_message_at', { ascending: false }),
        supabase.from('conversation_members').select('conversation_id, user_id').in('conversation_id', convIds).neq('user_id', user.id),
      ]);
      if (convRes.error) throw convRes.error;

      const otherUserByConv = new Map<string, string>();
      (otherMembersRes.data ?? []).forEach((m: any) => {
        otherUserByConv.set(m.conversation_id, m.user_id);
      });

      const otherUserIds = Array.from(otherUserByConv.values());
      const { data: identities } = await supabase
        .from('anonymous_identities')
        .select('*')
        .in('user_id', otherUserIds)
        .eq('is_primary', true);
      const identityByUser = new Map<string, AnonymousIdentity>();
      (identities ?? []).forEach((ai: any) => identityByUser.set(ai.user_id, ai));

      // Get last message preview + unread count per conversation
      const convList: Conversation[] = [];
      for (const conv of (convRes.data ?? []) as any[]) {
        const otherUserId = otherUserByConv.get(conv.id);
        const otherIdentity = otherUserId ? identityByUser.get(otherUserId) : undefined;
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('body, created_at')
          .eq('conversation_id', conv.id)
          .eq('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('deleted_at', null)
          .gt('created_at', lastReadMap.get(conv.id) ?? '1970-01-01')
          .neq('sender_id', user.id);
        convList.push({
          ...conv,
          other_member_user_id: otherUserId,
          other_identity: otherIdentity,
          last_message_body: lastMsg?.body,
          last_message_at_actual: lastMsg?.created_at ?? conv.last_message_at,
          unread_count: count ?? 0,
        });
      }
      convList.sort((a, b) => (b.last_message_at_actual ?? '').localeCompare(a.last_message_at_actual ?? ''));
      setConversations(convList);
    } catch (e: any) {
      setError(e?.message ?? t('messages.error'));
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

  const renderItem = ({ item }: { item: Conversation }) => {
    const name = item.other_identity?.nickname?.trim() || `Kindred #${item.other_identity?.display_code ?? '?????'}`;
    return (
      <Pressable
        onPress={() => router.push(`/conversation/${item.id}`)}
        style={({ pressed }) => [styles.convItem, { backgroundColor: pressed ? theme.bgSubtle : 'transparent' }]}
      >
        <Avatar identity={item.other_identity} size={48} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText variant="label" numberOfLines={1}>{name}</ThemedText>
            <ThemedText variant="caption" color="tertiary">
              {item.last_message_at_actual ? timeAgo(item.last_message_at_actual) : ''}
            </ThemedText>
          </View>
          <ThemedText variant="bodySmall" color="secondary" numberOfLines={1} style={{ marginTop: 2 }}>
            {item.last_message_body ?? t('messages.empty.chat')}
          </ThemedText>
        </View>
        {item.unread_count && item.unread_count > 0 ? (
          <View style={[styles.unreadBadge, { backgroundColor: theme.brand }]}>
            <ThemedText variant="caption" color="inverse">{item.unread_count}</ThemedText>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <ThemedText variant="h1">{t('messages.title')}</ThemedText>
      </View>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : conversations.length === 0 ? (
        <EmptyState message={t('messages.empty')} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.brand} />}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  convItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
});
