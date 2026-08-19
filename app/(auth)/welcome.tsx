import { View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/Button';
import { HeartHandshake } from 'lucide-react-native';

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <View style={[styles.logoCircle, { backgroundColor: theme.brandLight }]}>
          <HeartHandshake size={48} color={theme.brand} />
        </View>
        <ThemedText variant="display" style={{ marginTop: 24, textAlign: 'center' }}>
          {t('brand.name')}
        </ThemedText>
        <ThemedText variant="body" color="secondary" style={{ marginTop: 8, textAlign: 'center' }}>
          {t('auth.welcome.subtitle')}
        </ThemedText>
        <ThemedText variant="caption" color="tertiary" style={{ marginTop: 20, textAlign: 'center', fontStyle: 'italic' }}>
          {t('brand.principle')}
        </ThemedText>
      </View>

      <View style={styles.footer}>
        <Button variant="primary" size="lg" fullWidth onPress={() => router.push('/(auth)/signup')}>
          {t('auth.welcome.cta')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingBottom: 24 },
});
