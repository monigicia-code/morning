import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, User, Shield, Bell, Globe, Palette, Database, FileText, Trash2, LogOut, BadgeCheck, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/hooks/useAuth';
import { Alert } from 'react-native';

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { signOut } = useAuth();

  const items = [
    { icon: User, label: t('settings.account'), href: '/settings/account' },
    { icon: Shield, label: t('settings.privacy'), href: '/settings/privacy' },
    { icon: Bell, label: t('settings.notifications'), href: '/settings/notifications' },
    { icon: Globe, label: t('settings.language'), href: '/settings/language' },
    { icon: Palette, label: t('settings.appearance'), href: '/settings/appearance' },
    { icon: BadgeCheck, label: t('verification.title'), href: '/verification/index' },
    { icon: ShieldCheck, label: t('safety.title'), href: '/safety/index' },
    { icon: Database, label: t('settings.data'), href: '/settings/account' },
    { icon: FileText, label: t('settings.legal'), href: '/legal/terms' },
    { icon: Trash2, label: t('settings.deleteAccount'), href: '/settings/delete-account' },
  ];

  const handleLogout = () => {
    Alert.alert(t('settings.logoutConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={styles.header}>
        <ThemedText variant="h1">{t('settings.title')}</ThemedText>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {items.map((item, i) => (
          <Pressable
            key={i}
            onPress={() => router.push(item.href as any)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: pressed ? theme.bgSubtle : 'transparent', borderBottomColor: theme.border },
            ]}
          >
            <item.icon size={20} color={theme.textSecondary} />
            <ThemedText variant="body" style={{ flex: 1, marginLeft: 12 }}>{item.label}</ThemedText>
            <ChevronRight size={18} color={theme.textTertiary} />
          </Pressable>
        ))}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: pressed ? theme.bgSubtle : 'transparent' },
          ]}
        >
          <LogOut size={20} color={theme.error} />
          <ThemedText variant="body" color="error" style={{ flex: 1, marginLeft: 12 }}>{t('settings.logout')}</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
});
