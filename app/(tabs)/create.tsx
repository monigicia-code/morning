import { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, AlertTriangle, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedInput } from '@/components/ThemedInput';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useHelpCategories } from '@/hooks/useReferenceData';
import { localizedCategoryName } from '@/i18n/I18nContext';
import { hasDoxxingRisk } from '@/utils';

export default function CreatePostScreen() {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const { identity } = useProfile();
  const { categories } = useHelpCategories();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [allowComments, setAllowComments] = useState(true);
  const [allowMessages, setAllowMessages] = useState(true);
  const [showDoxxingWarning, setShowDoxxingWarning] = useState(false);
  const [doxxingAcknowledged, setDoxxingAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDoxxing = (text: string) => {
    if (hasDoxxingRisk(text) && !doxxingAcknowledged) {
      setShowDoxxingWarning(true);
    }
  };

  const submit = async () => {
    setError(null);
    if (!title.trim() || !body.trim()) {
      setError(t('create.error.empty'));
      return;
    }
    if (title.length > 100) {
      setError(t('create.error.titleTooLong'));
      return;
    }
    if (body.length > 5000) {
      setError(t('create.error.bodyTooLong'));
      return;
    }
    if (hasDoxxingRisk(title + ' ' + body) && !doxxingAcknowledged) {
      setShowDoxxingWarning(true);
      return;
    }
    if (!user || !identity) return;

    const tagArray = tags
      .split(',')
      .map((s) => s.trim().replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 5);

    setSubmitting(true);
    const { data, error: e } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        anonymous_identity_id: identity.id,
        category_id: categoryId,
        title: title.trim(),
        body: body.trim(),
        tags: tagArray,
        location_region: locationRegion.trim() || null,
        allow_comments: allowComments,
        allow_messages: allowMessages,
        contains_flagged_content: hasDoxxingRisk(title + ' ' + body),
      })
      .select('id')
      .single();
    setSubmitting(false);
    if (e) {
      if (e.message.includes('rate_limit')) {
        setError(t('create.error.rateLimit'));
      } else {
        setError(e.message);
      }
      return;
    }
    if (data) {
      router.replace(`/post/${data.id}`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <ThemedText variant="h2">{t('create.title')}</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.postingAsBanner, { backgroundColor: theme.brandLight }]}>
            <Avatar identity={identity} size={32} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="caption" color="tertiary">
                {t('create.postingAs')}
              </ThemedText>
              <ThemedText variant="label" color="brand">
                {identity?.nickname?.trim() || `Kindred #${identity?.display_code}`}
              </ThemedText>
            </View>
          </View>

          <ThemedText variant="label" color="secondary" style={{ marginTop: 16, marginBottom: 6 }}>
            {t('create.postTitle')}
          </ThemedText>
          <ThemedInput
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              checkDoxxing(text);
            }}
            placeholder={t('create.postTitlePlaceholder')}
            maxLength={100}
          />

          <ThemedText variant="label" color="secondary" style={{ marginTop: 16, marginBottom: 6 }}>
            {t('create.body')}
          </ThemedText>
          <ThemedInput
            value={body}
            onChangeText={(text) => {
              setBody(text);
              checkDoxxing(text);
            }}
            placeholder={t('create.bodyPlaceholder')}
            multiline
            maxLength={5000}
            style={{ minHeight: 120 }}
          />

          <ThemedText variant="label" color="secondary" style={{ marginTop: 16, marginBottom: 6 }}>
            {t('create.category')}
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: categoryId === cat.id ? theme.brand : theme.bgCard,
                    borderColor: categoryId === cat.id ? theme.brand : theme.border,
                  },
                ]}
              >
                <ThemedText variant="caption" color={categoryId === cat.id ? 'inverse' : 'secondary'}>
                  {localizedCategoryName(cat, locale)}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <ThemedText variant="label" color="secondary" style={{ marginTop: 16, marginBottom: 6 }}>
            {t('create.tags')}
          </ThemedText>
          <ThemedInput
            value={tags}
            onChangeText={setTags}
            placeholder={t('create.tagsPlaceholder')}
          />

          <ThemedText variant="label" color="secondary" style={{ marginTop: 16, marginBottom: 6 }}>
            {t('create.location')}
          </ThemedText>
          <ThemedInput
            value={locationRegion}
            onChangeText={setLocationRegion}
            placeholder={t('create.locationPlaceholder')}
            maxLength={60}
          />

          <View style={{ marginTop: 16, gap: 12 }}>
            <ToggleRow
              label={t('create.allowComments')}
              value={allowComments}
              onToggle={() => setAllowComments(!allowComments)}
              theme={theme}
            />
            <ToggleRow
              label={t('create.allowMessages')}
              value={allowMessages}
              onToggle={() => setAllowMessages(!allowMessages)}
              theme={theme}
            />
          </View>

          {showDoxxingWarning && (
            <Card style={{ marginTop: 16, backgroundColor: theme.warningBg, borderColor: theme.warning }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <AlertTriangle size={20} color={theme.warning} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodySmall" color="secondary">
                    {t('create.doxxing.warning')}
                  </ThemedText>
                  <Pressable
                    onPress={() => {
                      setDoxxingAcknowledged(true);
                      setShowDoxxingWarning(false);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}
                  >
                    <View style={[styles.checkbox, { borderColor: doxxingAcknowledged ? theme.brand : theme.borderStrong, backgroundColor: doxxingAcknowledged ? theme.brand : 'transparent' }]}>
                      {doxxingAcknowledged && <Check size={14} color="#fff" />}
                    </View>
                    <ThemedText variant="caption" color="secondary">
                      {t('create.doxxing.review')}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </Card>
          )}

          {error && (
            <ThemedText color="error" variant="bodySmall" style={{ marginTop: 12 }}>
              {error}
            </ThemedText>
          )}

          <Button variant="primary" size="lg" fullWidth onPress={submit} loading={submitting} style={{ marginTop: 24 }}>
            {t('create.publish')}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ToggleRow({ label, value, onToggle, theme }: { label: string; value: boolean; onToggle: () => void; theme: any }) {
  return (
    <Pressable onPress={onToggle} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
  postingAsBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
