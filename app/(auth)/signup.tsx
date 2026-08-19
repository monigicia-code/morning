import { useState } from 'react';
import { View, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedInput } from '@/components/ThemedInput';
import { Button } from '@/components/Button';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError(t('auth.error.generic'));
      return;
    }
    if (password.length < 8) {
      setError(t('auth.error.weakPassword'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.error.generic'));
      return;
    }
    setLoading(true);
    const { data, error: e } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (e) {
      if (e.message.includes('already')) setError(t('auth.error.userExists'));
      else if (e.message.includes('weak') || e.message.includes('password'))
        setError(t('auth.error.weakPassword'));
      else if (e.message.includes('network') || e.message.includes('fetch'))
        setError(t('auth.error.network'));
      else setError(t('auth.error.generic'));
      return;
    }
    if (data.user) {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flex: 1, paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 24, marginTop: 8 }}>
            <ArrowLeft size={24} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ThemedText variant="h1">{t('auth.signup.title')}</ThemedText>
            <ThemedText variant="body" color="secondary" style={{ marginTop: 6, marginBottom: 28 }}>
              {t('auth.signup.subtitle')}
            </ThemedText>

            <ThemedText variant="label" color="secondary" style={{ marginBottom: 6 }}>
              {t('auth.signup.email')}
            </ThemedText>
            <ThemedInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <ThemedText variant="label" color="secondary" style={{ marginTop: 16, marginBottom: 6 }}>
              {t('auth.signup.password')}
            </ThemedText>
            <ThemedInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="new-password"
            />

            <ThemedText variant="label" color="secondary" style={{ marginTop: 16, marginBottom: 6 }}>
              {t('auth.signup.confirmPassword')}
            </ThemedText>
            <ThemedInput
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="new-password"
            />

            {error && (
              <ThemedText color="error" variant="bodySmall" style={{ marginTop: 12 }}>
                {error}
              </ThemedText>
            )}

            <Button variant="primary" size="lg" fullWidth loading={loading} onPress={submit} style={{ marginTop: 24 }}>
              {t('auth.signup.submit')}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
