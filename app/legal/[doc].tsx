import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';

export default function LegalDocScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const docMap: Record<string, string> = {
    terms: 'legal.terms',
    privacy: 'legal.privacy',
    guidelines: 'legal.guidelines',
    verification: 'legal.verification',
    moderation: 'legal.moderation',
  };

  const titleKey = docMap[doc ?? 'terms'] ?? 'legal.terms';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <ThemedText variant="h2">{t(titleKey as any)}</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
        <Card style={{ backgroundColor: theme.warningBg, borderColor: theme.warning, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AlertTriangle size={18} color={theme.warning} />
            <ThemedText variant="caption" color="secondary" style={{ flex: 1 }}>{t('legal.disclaimer')}</ThemedText>
          </View>
        </Card>
        <ThemedText variant="body" color="secondary" style={{ lineHeight: 24 }}>
          {t(titleKey as any)} — placeholder content. This document will be replaced with reviewed legal text before public release.
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
});
