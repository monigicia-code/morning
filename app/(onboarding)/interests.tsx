import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useInterests } from '@/hooks/useReferenceData';
import { localizedInterestName } from '@/i18n/I18nContext';
import type { Interest } from '@/types/database';

export default function InterestsStep() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const { interests, loading } = useInterests();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (interest: Interest) => {
    const next = new Set(selected);
    if (next.has(interest.id)) next.delete(interest.id);
    else next.add(interest.id);
    setSelected(next);
    setError(null);
  };

  const next = async () => {
    if (selected.size < 3) {
      setError(t('onboarding.interests.min'));
      return;
    }
    if (!user) return;
    setSubmitting(true);
    const rows = Array.from(selected).map((interestId) => ({
      user_id: user.id,
      interest_id: interestId,
    }));
    const { error: e } = await supabase.from('user_interests').upsert(rows, { onConflict: 'user_id,interest_id' });
    setSubmitting(false);
    if (e) {
      setError(e.message);
      return;
    }
    router.push('/(onboarding)/help');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={styles.progressRow}>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.brand, width: `${(6 / 7) * 100}%` }]} />
        </View>
        <ThemedText variant="caption" color="tertiary">
          {t('onboarding.step', { current: 6, total: 7 })}
        </ThemedText>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
        <ThemedText variant="h1">{t('onboarding.interests.title')}</ThemedText>
        <ThemedText variant="body" color="secondary" style={{ marginTop: 6 }}>
          {t('onboarding.interests.body')}
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 }} style={{ flex: 1 }}>
        <View style={styles.grid}>
          {interests.map((interest) => {
            const active = selected.has(interest.id);
            return (
              <Pressable
                key={interest.id}
                onPress={() => toggle(interest)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.brand : theme.bgCard,
                    borderColor: active ? theme.brand : theme.border,
                  },
                ]}
              >
                <ThemedText
                  variant="label"
                  color={active ? 'inverse' : 'secondary'}
                >
                  {localizedInterestName(interest, locale)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        {error && (
          <ThemedText color="error" variant="bodySmall" style={{ marginTop: 12 }}>
            {error}
          </ThemedText>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <Button variant="primary" size="lg" fullWidth onPress={next} loading={submitting}>
          {t('common.continue')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressRow: { paddingHorizontal: 24, paddingTop: 16, gap: 8 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
});
