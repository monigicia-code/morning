import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, BellOff, MessageSquare, Heart, UserPlus, Shield } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { LoadingState, EmptyState } from '@/components/StateViews';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTimeAgo } from '@/utils';
import type { NotificationItem, NotificationType } from '@/types/database';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const timeAgo = useTimeAgo();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
    setNotifications((data ?? []) as NotificationItem[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('user_id', user.id).eq('is_read', false);
    load();
  };

  const iconForType = (type: NotificationType) => {
    switch (type) {
      case 'new_comment': return MessageSquare;
      case 'new_message': return MessageSquare;
      case 'new_match': return UserPlus;
      case 'helpful_reaction': return Heart;
      case 'moderation_notice': return Shield;
      case 'safety_notice': return Shield;
      default: return Bell;
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const Icon = iconForType(item.type);
    return (
      <Pressable
        onPress={() => {
          if (!item.is_read && user) {
            supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', item.id);
            load();
          }
          if (item.target_type === 'post' && item.target_id) router.push(`/post/${item.target_id}`);
          if (item.target_type === 'conversation' && item.target_id) router.push(`/conversation/${item.target_id}`);
        }}
        style={({ pressed }) => [styles.item, { backgroundColor: pressed ? theme.bgSubtle : item.is_read ? 'transparent' : theme.brandLight + '40' }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: item.is_read ? theme.bgSubtle : theme.brandLight }]}>
          <Icon size={18} color={item.is_read ? theme.textTertiary : theme.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText variant="label" numberOfLines={1}>{item.title}</ThemedText>
          {item.body && <ThemedText variant="bodySmall" color="secondary" numberOfLines={2} style={{ marginTop: 2 }}>{item.body}</ThemedText>}
          <ThemedText variant="caption" color="tertiary" style={{ marginTop: 4 }}>{timeAgo(item.created_at)}</ThemedText>
        </View>
        {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: theme.brand }]} />}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <ThemedText variant="h1">{t('notifications.title')}</ThemedText>
        <Pressable onPress={markAllRead}>
          <ThemedText variant="caption" color="brand">{t('notifications.markAllRead')}</ThemedText>
        </Pressable>
      </View>
      {loading ? (
        <LoadingState />
      ) : notifications.length === 0 ? (
        <EmptyState message={t('notifications.empty')} />
      ) : (
        <FlatList
          data={notifications}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
});
