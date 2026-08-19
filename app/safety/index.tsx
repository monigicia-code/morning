import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, ShieldCheck, Flag, Ban, AlertCircle, Lock, ShieldAlert, FileText, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';

export default function SafetyScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const sections = [
    { icon: Eye, titleKey: 'safety.anon', bodyKey: 'safety.anon.body' },
    { icon: ShieldCheck, titleKey: 'safety.verify', bodyKey: 'safety.verify.body' },
    { icon: Flag, titleKey: 'safety.report', bodyKey: 'safety.report.body' },
    { icon: Ban, titleKey: 'safety.block', bodyKey: 'safety.block.body' },
    { icon: AlertCircle, titleKey: 'safety.scams', bodyKey: 'safety.scams.body' },
    { icon: Lock, titleKey: 'safety.privacy', bodyKey: 'safety.privacy.body' },
    { icon: ShieldAlert, titleKey: 'safety.moderation', bodyKey: 'safety.moderation.body' },
    { icon: AlertCircle, titleKey: 'safety.emergency', bodyKey: 'safety.emergency.body' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <ThemedText variant="h2">{t('safety.title')}</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
        {sections.map((s, i) => (
          <Card key={i} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.iconCircle, { backgroundColor: theme.brandLight }]}>
                <s.icon size={20} color={theme.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="label">{t(s.titleKey as any)}</ThemedText>
                <ThemedText variant="bodySmall" color="secondary" style={{ marginTop: 4, lineHeight: 20 }}>{t(s.bodyKey as any)}</ThemedText>
              </View>
            </View>
          </Card>
        ))}
        <Pressable onPress={() => router.push('/safety/blocked')} style={({ pressed }) => [styles.menuRow, { backgroundColor: pressed ? theme.bgSubtle : 'transparent', borderBottomColor: theme.border }]}>
          <Ban size={20} color={theme.textSecondary} />
          <ThemedText variant="body" style={{ flex: 1, marginLeft: 12 }}>{t('safety.blockedUsers')}</ThemedText>
          <ChevronRight size={18} color={theme.textTertiary} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, marginTop: 8 },
});
