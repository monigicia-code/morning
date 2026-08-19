import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { ThemePreference } from '@/types/database';

export default function AppearanceScreen() {
  const { theme, isDark, setPreference } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();

  const select = (pref: ThemePreference) => {
    setPreference(pref);
    if (user) supabase.from('profiles').update({ theme_preference: pref }).eq('id', user.id);
  };

  const options: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('settings.appearance.system') },
    { value: 'light', label: t('settings.appearance.light') },
    { value: 'dark', label: t('settings.appearance.dark') },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <ThemedText variant="h2">{t('settings.appearance')}</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
        {options.map((opt) => (
          <Pressable key={opt.value} onPress={() => select(opt.value)} style={[styles.option, { borderColor: theme.bg === theme.bg ? theme.border : theme.border }]}>
            <ThemedText variant="body">{opt.label}</ThemedText>
            {theme.isDark === (opt.value === 'dark') && <Check size={20} color={theme.brand} />}
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
});
