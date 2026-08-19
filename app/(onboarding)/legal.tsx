import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Circle, FileText } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function LegalStep() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [guidelines, setGuidelines] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const allAccepted = terms && privacy && guidelines;

  const accept = async () => {
    if (!allAccepted) {
      setError(t('onboarding.legal.mustAccept'));
      return;
    }
    if (!user) return;
    setLoading(true);
    const { error: e } = await supabase
      .from('profiles')
      .update({
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted_at: new Date().toISOString(),
        guidelines_accepted_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    setLoading(false);
    if (e) {
      setError(e.message);
      return;
    }
    router.push('/(onboarding)/age');
  };

  const Item = ({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) => (
    <Pressable onPress={onPress} style={styles.item}>
      {checked ? <CheckCircle2 size={24} color={theme.brand} /> : <Circle size={24} color={theme.borderStrong} />}
      <ThemedText variant="body" style={{ flex: 1, marginLeft: 12 }}>
        {label}
      </ThemedText>
      <FileText size={18} color={theme.textTertiary} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        <ThemedText variant="display" style={{ textAlign: 'center' }}>
          {t('onboarding.legal.title')}
        </ThemedText>
        <ThemedText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: 12, marginBottom: 32, lineHeight: 24 }}>
          {t('onboarding.legal.body')}
        </ThemedText>

        <Item checked={terms} onPress={() => setTerms(!terms)} label={t('onboarding.legal.terms')} />
        <Item checked={privacy} onPress={() => setPrivacy(!privacy)} label={t('onboarding.legal.privacy')} />
        <Item checked={guidelines} onPress={() => setGuidelines(!guidelines)} label={t('onboarding.legal.guidelines')} />

        {error && (
          <ThemedText color="error" variant="bodySmall" style={{ marginTop: 16, textAlign: 'center' }}>
            {error}
          </ThemedText>
        )}
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <Button variant="primary" size="lg" fullWidth onPress={accept} loading={loading}>
          {t('common.continue')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
});
