import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings, Shield, Bookmark, FileText, Bell, ChevronRight, BadgeCheck, LogOut } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { ThemedInput } from '@/components/ThemedInput';
import { LoadingState, ErrorState } from '@/components/StateViews';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useInterests, useHelpCategories } from '@/hooks/useReferenceData';
import { localizedInterestName, localizedCategoryName } from '@/i18n/I18nContext';
import type { Post, Interest, HelpCategory } from '@/types/database';
import { formatCount } from '@/utils';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile, identity, verification, loading, error, reload } = useProfile();
  const { interests } = useInterests();
  const { categories } = useHelpCategories();
  const [myInterests, setMyInterests] = useState<Interest[]>([]);
  const [myHelpCats, setMyHelpCats] = useState<{ category: HelpCategory; role: string }[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [helpfulReceived, setHelpfulReceived] = useState(0);
  const [editing, setEditing] = useState(false);
  const [nick, setNick] = useState(identity?.nickname ?? '');
  const [bio, setBio] = useState(identity?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [interestsRes, helpCatsRes, postsRes] = await Promise.all([
      supabase.from('user_interests').select('interest:interests(*)').eq('user_id', user.id),
      supabase.from('user_help_categories').select('role, category:help_categories(*)').eq('user_id', user.id),
      supabase.from('posts').select('id, title, helpful_count, comment_count, created_at').eq('author_id', user.id).eq('deleted_at', null).order('created_at', { ascending: false }).limit(10),
    ]);
    setMyInterests((interestsRes.data ?? []).map((r: any) => r.interest as Interest));
    setMyHelpCats((helpCatsRes.data ?? []).map((r: any) => ({ category: r.category as HelpCategory, role: r.role })));
    setMyPosts((postsRes.data ?? []) as unknown as Post[]);
    const totalHelpful = (postsRes.data ?? []).reduce((sum: number, p: any) => sum + (p.helpful_count ?? 0), 0);
    setHelpfulReceived(totalHelpful);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setNick(identity?.nickname ?? '');
    setBio(identity?.bio ?? '');
  }, [identity]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), reload()]);
    setRefreshing(false);
  };

  const saveIdentity = async () => {
    if (!identity) return;
    setSaving(true);
    await supabase.from('anonymous_identities').update({ nickname: nick.trim() || null, bio: bio.trim() }).eq('id', identity.id);
    setSaving(false);
    setEditing(false);
    reload();
  };

  if (loading && !identity) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}><LoadingState /></SafeAreaView>;
  if (error) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}><ErrorState message={error} onRetry={reload} /></SafeAreaView>;

  const displayName = identity?.nickname?.trim() || `Kindred #${identity?.display_code}`;

  const menuItems = [
    { icon: Shield, label: t('safety.title'), href: '/safety/index' },
    { icon: BadgeCheck, label: t('verification.title'), href: '/verification/index' },
    { icon: Bell, label: t('notifications.title'), href: '/notifications/index' },
    { icon: Bookmark, label: t('profile.saved'), href: '/(tabs)/home' },
    { icon: Settings, label: t('settings.title'), href: '/settings/index' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.brand} />}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16, alignItems: 'center' }}>
          <Avatar identity={identity} size={88} />
          <ThemedText variant="h1" style={{ marginTop: 12 }}>{displayName}</ThemedText>
          <ThemedText variant="caption" color="tertiary">
            Kindred #{identity?.display_code}
          </ThemedText>
          {verification?.status === 'verified' && (
            <View style={[styles.verifiedPill, { backgroundColor: theme.successBg }]}>
              <BadgeCheck size={14} color={theme.success} />
              <ThemedText variant="caption" color="success" style={{ marginLeft: 4 }}>
                {t('verification.status.verified')}
              </ThemedText>
            </View>
          )}
          {identity?.bio ? (
            <ThemedText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: 12, lineHeight: 22 }}>
              {identity.bio}
            </ThemedText>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <ThemedText variant="h2">{myPosts.length}</ThemedText>
              <ThemedText variant="caption" color="tertiary">{t('profile.posts')}</ThemedText>
            </View>
            <View style={styles.stat}>
              <ThemedText variant="h2">{formatCount(helpfulReceived)}</ThemedText>
              <ThemedText variant="caption" color="tertiary">{t('profile.helpful')}</ThemedText>
            </View>
            <View style={styles.stat}>
              <ThemedText variant="h2">{myInterests.length}</ThemedText>
              <ThemedText variant="caption" color="tertiary">{t('profile.interests')}</ThemedText>
            </View>
          </View>

          <Button variant={editing ? 'primary' : 'outline'} size="sm" onPress={() => setEditing(!editing)} style={{ marginTop: 16 }}>
            {editing ? t('common.save') : t('profile.edit')}
          </Button>
        </View>

        {editing && (
          <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 12 }}>
            <View>
              <ThemedText variant="label" color="secondary" style={{ marginBottom: 6 }}>{t('profile.edit.nickname')}</ThemedText>
              <ThemedInput value={nick} onChangeText={setNick} placeholder={t('onboarding.identity.nicknamePlaceholder')} maxLength={30} />
            </View>
            <View>
              <ThemedText variant="label" color="secondary" style={{ marginBottom: 6 }}>{t('profile.edit.bio')}</ThemedText>
              <ThemedInput value={bio} onChangeText={setBio} placeholder={t('onboarding.identity.bioPlaceholder')} multiline maxLength={160} style={{ minHeight: 80 }} />
            </View>
            <Button variant="primary" onPress={saveIdentity} loading={saving}>{t('profile.edit.save')}</Button>
          </View>
        )}

        {myInterests.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <ThemedText variant="h3">{t('profile.interests')}</ThemedText>
            <View style={styles.tagsRow}>
              {myInterests.map((interest) => (
                <View key={interest.id} style={[styles.tag, { backgroundColor: theme.brandLight }]}>
                  <ThemedText variant="caption" color="brand">{localizedInterestName(interest, locale)}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}

        {myHelpCats.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <ThemedText variant="h3">{t('profile.helpCategories')}</ThemedText>
            <View style={styles.tagsRow}>
              {myHelpCats.map((hc) => (
                <View key={hc.category.id} style={[styles.tag, { backgroundColor: theme.bgSubtle }]}>
                  <ThemedText variant="caption" color="secondary">{localizedCategoryName(hc.category, locale)}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <ThemedText variant="h3">{t('profile.posts')}</ThemedText>
          {myPosts.length === 0 ? (
            <ThemedText variant="body" color="tertiary" style={{ marginTop: 12 }}>{t('profile.noPosts')}</ThemedText>
          ) : (
            <View style={{ marginTop: 12, gap: 8 }}>
              {myPosts.map((post) => (
                <Pressable key={post.id} onPress={() => router.push(`/post/${post.id}`)}>
                  <Card style={{ padding: 14 }}>
                    <ThemedText variant="label" numberOfLines={2}>{post.title}</ThemedText>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                      <ThemedText variant="caption" color="tertiary">{formatCount(post.helpful_count)} {t('post.helpful')}</ThemedText>
                      <ThemedText variant="caption" color="tertiary">{formatCount(post.comment_count)} {t('post.comments')}</ThemedText>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 24, gap: 4, paddingBottom: 100 }}>
          {menuItems.map((item, i) => (
            <Pressable
              key={i}
              onPress={() => router.push(item.href as any)}
              style={({ pressed }) => [
                styles.menuRow,
                { backgroundColor: pressed ? theme.bgSubtle : 'transparent', borderBottomColor: theme.border },
              ]}
            >
              <item.icon size={20} color={theme.textSecondary} />
              <ThemedText variant="body" style={{ flex: 1, marginLeft: 12 }}>{item.label}</ThemedText>
              <ChevronRight size={18} color={theme.textTertiary} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => signOut()}
            style={({ pressed }) => [
              styles.menuRow,
              { backgroundColor: pressed ? theme.bgSubtle : 'transparent' },
            ]}
          >
            <LogOut size={20} color={theme.error} />
            <ThemedText variant="body" color="error" style={{ flex: 1, marginLeft: 12 }}>{t('settings.logout')}</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 32, marginTop: 20 },
  stat: { alignItems: 'center' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
});
