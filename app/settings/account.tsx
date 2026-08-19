import { View, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Calendar, Shield, ChevronRight, Download, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useTimeAgo } from '@/utils';

export default function AccountScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const timeAgo = useTimeAgo();

  const requestData = () => {
    Alert.alert(t('settings.data.download'), t('settings.data.download.body'), [
      { text: t('settings.data.request'), onPress: () => Alert.alert(t('settings.data.requested')) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <ThemedText variant="h2">{t('settings.account')}</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <View style={styles.row}>
            <Mail size={20} color={theme.textSecondary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText variant="caption" color="tertiary">Email</ThemedText>
              <ThemedText variant="body">{user?.email ?? '—'}</ThemedText>
            </View>
          </View>
          <View style={[styles.row, { borderTopColor: theme.border, borderTopWidth: 1, marginTop: 12, paddingTop: 12 }]}>
            <Calendar size={20} color={theme.textSecondary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <ThemedText variant="caption" color="tertiary">Member since</ThemedText>
              <ThemedText variant="body">{profile ? timeAgo(profile.created_at) : '—'}</ThemedText>
            </View>
          </View>
        </View>

        <Pressable onPress={() => router.push('/settings/privacy')} style={({ pressed }) => [styles.menuRow, { backgroundColor: pressed ? theme.bgSubtle : 'transparent', borderBottomColor: theme.border }]}>
          <Shield size={20} color={theme.textSecondary} />
          <ThemedText variant="body" style={{ flex: 1, marginLeft: 12 }}>{t('settings.privacy')}</ThemedText>
          <ChevronRight size={18} color={theme.textTertiary} />
        </Pressable>

        <Pressable onPress={requestData} style={({ pressed }) => [styles.menuRow, { backgroundColor: pressed ? theme.bgSubtle : 'transparent', borderBottomColor: theme.border }]}>
          <Download size={20} color={theme.textSecondary} />
          <ThemedText variant="body" style={{ flex: 1, marginLeft: 12 }}>{t('settings.data.download')}</ThemedText>
          <ChevronRight size={18} color={theme.textTertiary} />
        </Pressable>

        <Pressable onPress={() => router.push('/settings/delete-account')} style={({ pressed }) => [styles.menuRow, { backgroundColor: pressed ? theme.bgSubtle : 'transparent' }]}>
          <Trash2 size={20} color={theme.error} />
          <ThemedText variant="body" color="error" style={{ flex: 1, marginLeft: 12 }}>{t('settings.deleteAccount')}</ThemedText>
          <ChevronRight size={18} color={theme.textTertiary} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, marginTop: 8 },
});
