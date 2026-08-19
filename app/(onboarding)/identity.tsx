import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedInput } from '@/components/ThemedInput';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export default function IdentityStep() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const { identity, reload } = useProfile();
  const [nickname, setNickname] = useState(identity?.nickname ?? '');
  const [bio, setBio] = useState(identity?.bio ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = async () => {
    if (!user || !identity) return;
    setSubmitting(true);
    setError(null);
    const { error: e } = await supabase
      .from('anonymous_identities')
      .update({
        nickname: nickname.trim() || null,
        bio: bio.trim(),
      })
      .eq('id', identity.id);
    setSubmitting(false);
    if (e) {
      setError(e.message);
      return;
    }
    await reload();
    router.push('/(onboarding)/finish');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={styles.progressRow}>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.brand, width: `${(7 / 7) * 100}%` }]} />
        </View>
        <ThemedText variant="caption" color="tertiary">
          {t('onboarding.step', { current: 7, total: 7 })}
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <ThemedText variant="h1">{t('onboarding.identity.title')}</ThemedText>
        <ThemedText variant="body" color="secondary" style={{ marginTop: 6 }}>
          {t('onboarding.identity.body')}
        </ThemedText>

        <View style={{ alignItems: 'center', marginVertical: 28 }}>
          <Avatar identity={identity} size={88} />
          {identity && (
            <ThemedText variant="h2" style={{ marginTop: 12 }}>
              Kindred #{identity.display_code}
            </ThemedText>
          )}
          <ThemedText variant="caption" color="tertiary">
            {t('onboarding.identity.yourCode')}
          </ThemedText>
        </View>

        <ThemedText variant="label" color="secondary" style={{ marginBottom: 6 }}>
          {t('onboarding.identity.nickname')}
        </ThemedText>
        <ThemedInput
          value={nickname}
          onChangeText={setNickname}
          placeholder={t('onboarding.identity.nicknamePlaceholder')}
          maxLength={30}
        />

        <ThemedText variant="label" color="secondary" style={{ marginTop: 16, marginBottom: 6 }}>
          {t('onboarding.identity.bio')}
        </ThemedText>
        <ThemedInput
          value={bio}
          onChangeText={setBio}
          placeholder={t('onboarding.identity.bioPlaceholder')}
          multiline
          maxLength={160}
          style={{ minHeight: 80 }}
        />

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
});
