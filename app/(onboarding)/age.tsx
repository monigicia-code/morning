import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function AgeStep() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = async () => {
    if (!confirmed) {
      setError(t('onboarding.age.mustConfirm'));
      return;
    }
    if (!user) return;
    setLoading(true);
    const { error: e } = await supabase
      .from('profiles')
      .update({ age_confirmed: true })
      .eq('id', user.id);
    setLoading(false);
    if (e) {
      setError(e.message);
      return;
    }
    router.push('/(onboarding)/interests');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <ThemedText variant="display" style={{ textAlign: 'center' }}>
          {t('onboarding.age.title')}
        </ThemedText>
        <ThemedText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: 12, marginBottom: 32, lineHeight: 24 }}>
          {t('onboarding.age.body')}
        </ThemedText>

        <Pressable onPress={() => setConfirmed(!confirmed)} style={styles.checkboxRow}>
          {confirmed ? (
            <CheckCircle2 size={26} color={theme.brand} />
          ) : (
            <Circle size={26} color={theme.borderStrong} />
          )}
          <ThemedText variant="body" style={{ flex: 1, marginLeft: 12 }}>
            {t('onboarding.age.confirm')}
          </ThemedText>
        </Pressable>

        {error && (
          <ThemedText color="error" variant="bodySmall" style={{ marginTop: 16, textAlign: 'center' }}>
            {error}
          </ThemedText>
        )}
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <Button variant="primary" size="lg" fullWidth onPress={next} loading={loading}>
          {t('common.continue')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center' },
});
