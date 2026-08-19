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
import { useHelpCategories } from '@/hooks/useReferenceData';
import { localizedCategoryName } from '@/i18n/I18nContext';
import type { HelpCategory, HelpRole } from '@/types/database';

export default function HelpStep() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const { categories, loading } = useHelpCategories();
  const [roles, setRoles] = useState<Record<string, HelpRole>>({});
  const [submitting, setSubmitting] = useState(false);

  const cycleRole = (catId: string) => {
    setRoles((prev) => {
      const current = prev[catId];
      const next: HelpRole = current === 'seeking' ? 'offering' : current === 'offering' ? 'both' : 'seeking';
      return { ...prev, [catId]: next };
    });
  };

  const roleLabel = (role?: HelpRole) =>
    !role ? '' : role === 'both' ? t('onboarding.help.role.both') : role === 'seeking' ? t('onboarding.help.role.seeking') : t('onboarding.help.role.offering');

  const next = async () => {
    if (!user) return;
    const entries = Object.entries(roles);
    if (entries.length === 0) {
      router.push('/(onboarding)/identity');
      return;
    }
    setSubmitting(true);
    const rows = entries.map(([categoryId, role]) => ({
      user_id: user.id,
      category_id: categoryId,
      role,
    }));
    await supabase.from('user_help_categories').upsert(rows, { onConflict: 'user_id,category_id' });
    setSubmitting(false);
    router.push('/(onboarding)/identity');
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
        <ThemedText variant="h1">{t('onboarding.help.title')}</ThemedText>
        <ThemedText variant="body" color="secondary" style={{ marginTop: 6 }}>
          {t('onboarding.help.body')}
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20 }} style={{ flex: 1 }}>
        <View style={{ gap: 8 }}>
          {categories.map((cat: HelpCategory) => {
            const role = roles[cat.id];
            const active = !!role;
            return (
              <Pressable
                key={cat.id}
                onPress={() => cycleRole(cat.id)}
                style={[
                  styles.row,
                  {
                    backgroundColor: active ? theme.brandLight : theme.bgCard,
                    borderColor: active ? theme.brand : theme.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText variant="body">{localizedCategoryName(cat, locale)}</ThemedText>
                  {cat.is_sensitive && (
                    <ThemedText variant="caption" color="tertiary" style={{ marginTop: 2 }}>
                      {t('home.sensitiveDisclaimer')}
                    </ThemedText>
                  )}
                </View>
                {active && (
                  <View style={[styles.rolePill, { backgroundColor: theme.brand }]}>
                    <ThemedText variant="caption" color="inverse">
                      {roleLabel(role)}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  rolePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
});
