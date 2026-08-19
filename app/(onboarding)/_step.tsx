import { View, StyleSheet, SafeAreaView } from 'react-native';
import { SafeAreaView as SAFE } from 'react-native-safe-area-context';
import { useRouter, useSegments } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';

interface StepProps {
  step: number;
  total: number;
  titleKey: string;
  bodyKey: string;
  icon?: React.ReactNode;
  nextHref: string;
  nextLabelKey?: string;
  children?: React.ReactNode;
  beforeNext?: () => Promise<boolean> | boolean;
  nextLoading?: boolean;
}

export function OnboardingStep({
  step,
  total,
  titleKey,
  bodyKey,
  icon,
  nextHref,
  nextLabelKey = 'common.continue',
  children,
  beforeNext,
  nextLoading,
}: StepProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const handleNext = async () => {
    if (beforeNext) {
      const ok = await beforeNext();
      if (!ok) return;
    }
    router.push(nextHref as any);
  };

  return (
    <SAFE style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={styles.progressRow}>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: theme.brand, width: `${(step / total) * 100}%` },
            ]}
          />
        </View>
        <ThemedText variant="caption" color="tertiary">
          {t('onboarding.step', { current: step, total })}
        </ThemedText>
      </View>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        {icon && <View style={{ marginBottom: 24, alignItems: 'center' }}>{icon}</View>}
        <ThemedText variant="display" style={{ textAlign: 'center' }}>
          {t(titleKey as any)}
        </ThemedText>
        <ThemedText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: 12, lineHeight: 24 }}>
          {t(bodyKey as any)}
        </ThemedText>
        {children}
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <Button variant="primary" size="lg" fullWidth onPress={handleNext} loading={nextLoading}>
          {t(nextLabelKey as any)}
        </Button>
      </View>
    </SAFE>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressRow: { paddingHorizontal: 24, paddingTop: 16, gap: 8 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
});
