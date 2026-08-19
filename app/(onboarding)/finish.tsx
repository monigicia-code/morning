import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function FinishStep() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();

  const enter = async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', user.id);
    }
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: theme.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Sparkles size={44} color={theme.brand} />
        </View>
        <ThemedText variant="display" style={{ textAlign: 'center' }}>
          {t('onboarding.finish.title')}
        </ThemedText>
        <ThemedText variant="body" color="secondary" style={{ textAlign: 'center', marginTop: 12, lineHeight: 24 }}>
          {t('onboarding.finish.body')}
        </ThemedText>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <Button variant="primary" size="lg" fullWidth onPress={enter}>
          {t('onboarding.finish.enter')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
