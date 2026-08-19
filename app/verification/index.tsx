import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, BadgeCheck, Clock, XCircle, AlertCircle, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useProfile } from '@/hooks/useProfile';
import type { VerificationStatus } from '@/types/database';

export default function VerificationScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { verification } = useProfile();

  const status = verification?.status ?? 'not_started';

  const statusConfig: Record<VerificationStatus, { icon: any; color: string; bg: string; bodyKey: string }> = {
    not_started: { icon: ShieldCheck, color: theme.textSecondary, bg: theme.bgSubtle, bodyKey: 'verification.intro' },
    pending: { icon: Clock, color: theme.warning, bg: theme.warningBg, bodyKey: 'verification.pending.body' },
    verified: { icon: BadgeCheck, color: theme.success, bg: theme.successBg, bodyKey: 'verification.verified.body' },
    rejected: { icon: XCircle, color: theme.error, bg: theme.errorBg, bodyKey: 'verification.rejected.body' },
    needs_review: { icon: AlertCircle, color: theme.warning, bg: theme.warningBg, bodyKey: 'verification.needs_review.body' },
    expired: { icon: AlertCircle, color: theme.textSecondary, bg: theme.bgSubtle, bodyKey: 'verification.expired.body' },
  };

  const cfg = statusConfig[status];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <ThemedText variant="h2">{t('verification.title')}</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
        <Card style={{ backgroundColor: cfg.bg, borderColor: cfg.color, marginBottom: 16 }}>
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <View style={[styles.iconCircle, { backgroundColor: cfg.color }]}>
              <cfg.icon size={28} color="#fff" />
            </View>
            <ThemedText variant="h3" style={{ marginTop: 12 }}>{t(`verification.status.${status}` as any)}</ThemedText>
            <ThemedText variant="bodySmall" color="secondary" style={{ textAlign: 'center', marginTop: 8, lineHeight: 20 }}>{t(cfg.bodyKey as any)}</ThemedText>
          </View>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <ThemedText variant="bodySmall" color="secondary" style={{ lineHeight: 20 }}>{t('verification.privacy')}</ThemedText>
        </Card>

        {(status === 'not_started' || status === 'rejected' || status === 'expired') && (
          <Button variant="primary" size="lg" fullWidth onPress={() => { /* Provider not configured */ }}>
            {t('verification.start')}
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
