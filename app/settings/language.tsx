import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Locale } from '@/types/database';

export default function LanguageScreen() {
  const { theme } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const { user } = useAuth();

  const select = (l: Locale) => {
    setLocale(l);
    if (user) supabase.from('profiles').update({ locale: l }).eq('id', user.id);
  };

  const options: { value: Locale; label: string }[] = [
    { value: 'en', label: t('settings.language.en') },
    { value: 'zh', label: t('settings.language.zh') },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <ThemedText variant="h2">{t('settings.language')}</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
        {options.map((opt) => (
          <Pressable key={opt.value} onPress={() => select(opt.value)} style={[styles.option, { borderColor: locale === opt.value ? theme.brand : theme.border }]}>
            <ThemedText variant="body">{opt.label}</ThemedText>
            {locale === opt.value && <Check size={20} color={theme.brand} />}
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
