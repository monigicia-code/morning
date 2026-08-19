import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingState, EmptyState } from '@/components/StateViews';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Block, AnonymousIdentity } from '@/types/database';

export default function BlockedScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<(Block & { blocked_identity?: AnonymousIdentity })[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('blocks').select('*').eq('blocker_id', user.id);
    const blockList = (data ?? []) as Block[];
    if (blockList.length === 0) {
      setBlocks([]);
      setLoading(false);
      return;
    }
    const blockedIds = blockList.map((b) => b.blocked_id);
    const { data: identities } = await supabase.from('anonymous_identities').select('*').in('user_id', blockedIds).eq('is_primary', true);
    const identityMap = new Map((identities ?? []).map((ai: any) => [ai.user_id, ai]));
    setBlocks(blockList.map((b) => ({ ...b, blocked_identity: identityMap.get(b.blocked_id) })));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const unblock = async (block: Block) => {
    Alert.alert(t('safety.blocked.unblock'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('safety.blocked.unblock'), onPress: async () => {
        await supabase.from('blocks').delete().eq('id', block.id);
        load();
      }},
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <ThemedText variant="h2">{t('safety.blockedUsers')}</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <LoadingState />
      ) : blocks.length === 0 ? (
        <EmptyState message={t('safety.blocked.empty')} />
      ) : (
        <FlatList
          data={blocks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const name = item.blocked_identity?.nickname?.trim() || `Kindred #${item.blocked_identity?.display_code ?? '?????'}`;
            return (
              <Card style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar identity={item.blocked_identity} size={40} />
                  <ThemedText variant="body" style={{ flex: 1 }}>{name}</ThemedText>
                  <Button variant="outline" size="sm" onPress={() => unblock(item)}>{t('safety.blocked.unblock')}</Button>
                </View>
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
});
