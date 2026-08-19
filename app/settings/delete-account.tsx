import { useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedInput } from '@/components/ThemedInput';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function DeleteAccountScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (confirmText !== 'DELETE') {
      Alert.alert(t('common.error'), t('settings.delete.confirm'));
      return;
    }
    Alert.alert(t('settings.delete.confirmPrompt'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.delete.submit'),
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          if (user) {
            await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', user.id);
            await supabase.auth.signOut();
          }
          setLoading(false);
          signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <ThemedText variant="h2">{t('settings.deleteAccount')}</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
        <Card style={{ backgroundColor: theme.warningBg, borderColor: theme.warning, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AlertTriangle size={20} color={theme.warning} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="bodySmall" color="secondary">{t('settings.delete.body')}</ThemedText>
            </View>
          </View>
        </Card>
        <ThemedText variant="label" color="secondary" style={{ marginBottom: 6 }}>{t('settings.delete.confirm')}</ThemedText>
        <ThemedInput value={confirmText} onChangeText={setConfirmText} placeholder={t('settings.delete.confirmPlaceholder')} autoCapitalize="characters" />
        <Button variant="danger" size="lg" fullWidth onPress={submit} loading={loading} style={{ marginTop: 24 }}>{t('settings.delete.submit')}</Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
});
