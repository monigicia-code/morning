import { useState } from 'react';
import { Modal, View, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ThemedText } from './ThemedText';
import { ThemedInput } from './ThemedInput';
import { Button } from './Button';
import { useI18n } from '@/i18n/I18nContext';
import { supabase } from '@/lib/supabase';
import type { ReportReason, ReportTargetType } from '@/types/database';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
}

const REASONS: ReportReason[] = [
  'harassment', 'threats', 'hate', 'sexual_content', 'child_safety',
  'fraud', 'scam', 'impersonation', 'spam', 'privacy_violation',
  'doxxing', 'illegal_activity', 'self_harm_concern', 'dangerous_advice', 'other',
];

export function ReportModal({ visible, onClose, targetType, targetId }: ReportModalProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setReason(null);
    setDescription('');
    setDone(false);
    setError(null);
  };

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    const { error: e } = await supabase.from('reports').insert({
      target_type: targetType,
      target_id: targetId,
      reason,
      description: description.trim() || null,
    });
    setSubmitting(false);
    if (e) {
      setError(e.message);
      return;
    }
    setDone(true);
  };

  const close = () => {
    onClose();
    setTimeout(reset, 300);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.bgElevated }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <ThemedText variant="h2">{t('report.title')}</ThemedText>
            <Pressable onPress={close} hitSlop={12} accessibilityLabel={t('common.close')}>
              <X size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          {done ? (
            <View style={{ paddingVertical: 24, alignItems: 'center', gap: 16 }}>
              <ThemedText variant="body" style={{ textAlign: 'center' }}>
                {t('report.success')}
              </ThemedText>
              <Button variant="primary" onPress={close}>
                {t('common.done')}
              </Button>
            </View>
          ) : (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView style={{ maxHeight: 400 }}>
                <ThemedText variant="label" color="secondary" style={{ marginBottom: 8 }}>
                  {t('report.reason')}
                </ThemedText>
                <View style={styles.reasonGrid}>
                  {REASONS.map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => setReason(r)}
                      style={[
                        styles.reasonChip,
                        {
                          backgroundColor: reason === r ? theme.brandLight : theme.bgInput,
                          borderColor: reason === r ? theme.brand : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        variant="caption"
                        color={reason === r ? 'brand' : 'secondary'}
                      >
                        {t(`report.reason.${r}` as any)}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                <ThemedText variant="label" color="secondary" style={{ marginTop: 16, marginBottom: 8 }}>
                  {t('report.description')}
                </ThemedText>
                <ThemedInput
                  multiline
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('report.descriptionPlaceholder')}
                  style={{ minHeight: 80 }}
                />

                {error && (
                  <ThemedText color="error" variant="caption" style={{ marginTop: 8 }}>
                    {error}
                  </ThemedText>
                )}

                <Button
                  variant="primary"
                  fullWidth
                  loading={submitting}
                  disabled={!reason}
                  onPress={submit}
                  style={{ marginTop: 16 }}
                >
                  {t('report.submit')}
                </Button>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
});
