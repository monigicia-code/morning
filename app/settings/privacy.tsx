import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { Card } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function PrivacyScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const [messaging, setMessaging] = useState<'everyone' | 'connections'>('everyone');
  const [discoverable, setDiscoverable] = useState(true);
  const [showLocation, setShowLocation] = useState(true);

  const toggle = async (key: string, value: boolean) => {
    if (!user) return;
    await supabase.from('profiles').update({ [key]: value }).eq('id', user.id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <ThemedText variant="h2">{t('settings.privacy')}</ThemedText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
        <ThemedText variant="label" color="secondary" style={{ marginBottom: 8 }}>{t('settings.privacy.messaging')}</ThemedText>
        <Pressable onPress={() => setMessaging('everyone')} style={[styles.option, { borderColor: messaging === 'everyone' ? theme.brand : theme.border }]}>
          <ThemedText variant="body">{t('settings.privacy.messaging.everyone')}</ThemedText>
          {messaging === 'everyone' && <Check size={20} color={theme.brand} />}
        </Pressable>
        <Pressable onPress={() => setMessaging('connections')} style={[styles.option, { borderColor: messaging === 'connections' ? theme.brand : theme.border }]}>
          <ThemedText variant="body">{t('settings.privacy.messaging.connections')}</ThemedText>
          {messaging === 'connections' && <Check size={20} color={theme.brand} />}
        </Pressable>

        <ToggleRow label={t('settings.privacy.discoverable')} value={discoverable} onToggle={() => { setDiscoverable(!discoverable); toggle('discoverable', !discoverable); }} theme={theme} />
        <ToggleRow label={t('settings.privacy.showLocation')} value={showLocation} onToggle={() => { setShowLocation(!showLocation); toggle('show_location', !showLocation); }} theme={theme} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({ label, value, onToggle, theme }: { label: string; value: boolean; onToggle: () => void; theme: any }) {
  return (
    <Pressable onPress={onToggle} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 }}>
      <ThemedText variant="body">{label}</ThemedText>
      <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: value ? theme.brand : theme.border, justifyContent: 'center', paddingHorizontal: 2 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', transform: [{ translateX: value ? 18 : 0 }] }} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
});
