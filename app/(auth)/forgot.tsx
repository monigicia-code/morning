import { useState } from 'react';
import { View, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedInput } from '@/components/ThemedInput';
import { Button } from '@/components/Button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function ForgotScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    setSent(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flex: 1, paddingHorizontal: 24 }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 24, marginTop: 8 }}>
            <ArrowLeft size={24} color={theme.text} />
          </Pressable>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            {sent ? (
              <View style={{ alignItems: 'center', gap: 16 }}>
                <CheckCircle2 size={56} color={theme.success} />
                <ThemedText variant="body" style={{ textAlign: 'center' }}>
                  {t('auth.forgot.success')}
                </ThemedText>
                <Button variant="primary" onPress={() => router.replace('/(auth)/signup')}>
                  {t('auth.forgot.back')}
                </Button>
              </View>
            ) : (
              <>
                <ThemedText variant="h1">{t('auth.forgot.title')}</ThemedText>
                <ThemedText variant="body" color="secondary" style={{ marginTop: 6, marginBottom: 28 }}>
                  {t('auth.forgot.subtitle')}
                </ThemedText>
                <ThemedText variant="label" color="secondary" style={{ marginBottom: 6 }}>
                  {t('auth.forgot.email')}
                </ThemedText>
                <ThemedInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Button variant="primary" size="lg" fullWidth loading={loading} onPress={submit} style={{ marginTop: 24 }}>
                  {t('auth.forgot.submit')}
                </Button>
                <Pressable onPress={() => router.replace('/(auth)/signup')} style={{ marginTop: 20 }}>
                  <ThemedText variant="body" color="brand" style={{ textAlign: 'center' }}>
                    {t('auth.forgot.back')}
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
