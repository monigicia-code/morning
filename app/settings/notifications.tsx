import { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationsSettingsScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', user.id).maybeSingle();
      if (data) {
        setPrefs({
          new_comment: data.new_comment,
          new_message: data.new_message,
          new_match: data.new_match,
          helpful_reaction: data.helpful_reaction,
          moderation_notice: data.moderation_notice,
          safety_notice: data.safety_notice,
          community_update: data.community_update,
        });
      }
    })();
  }, [user]);

  const toggle = (key: string) => {
    const newVal = !prefs[key];
    setPrefs({ ...prefs, [key]: newVal });
    if (user) supabase.from('notification_preferences').update({ [key]: newVal }).eq('user_id', user.id);
  };

  const items = [
    { key: 'new_comment', label: t('settings.notifications.newComment') },
    { key: 'new_message', label: t('settings.notifications.newMessage') },
    { key: 'new_match', label: t('settings.notifications.newMatch') },
    { key: 'helpful_reaction', label: t('settings.notifications.helpfulReaction') },
    { key: 'moderation_notice', label: t('settings.notifications.moderationNotice') },
    { key: 'safety_notice', label: t('settings.notifications.safetyNotice') },
    { key: 'community_update', label: t('settings.notifications.communityUpdate') },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <ThemedText variant="h2">{t('settings.notifications')}</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
        {items.map((item) => (
          <Pressable key={item.key} onPress={() => toggle(item.key)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <ThemedText variant="body">{item.label}</ThemedText>
            <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: prefs[item.key] ? theme.brand : theme.border, justifyContent: 'center', paddingHorizontal: 2 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', transform: [{ translateX: prefs[item.key] ? 18 : 0 }] }} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
});
