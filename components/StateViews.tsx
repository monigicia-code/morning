import { View, StyleSheet, RefreshControl, ScrollView, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import { useI18n } from '@/i18n/I18nContext';

interface StateProps {
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export function LoadingState({ message, style }: { message?: string; style?: ViewStyle }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.center, style]}>
      <ThemedText color="tertiary" variant="body">
        {message ?? t('common.loading')}
      </ThemedText>
    </View>
  );
}

export function ErrorState({ message, onRetry, style }: StateProps) {
  const { t } = useI18n();
  return (
    <View style={[styles.center, { gap: 12 }, style]}>
      <ThemedText color="error" variant="body">
        {message ?? t('common.error')}
      </ThemedText>
      {onRetry && <Button variant="outline" size="sm" onPress={onRetry} title={t('common.retry')} />}
    </View>
  );
}

export function EmptyState({ message, style }: StateProps) {
  const { t } = useI18n();
  return (
    <View style={[styles.center, style]}>
      <ThemedText color="tertiary" variant="body" style={{ textAlign: 'center' }}>
        {message ?? t('common.empty')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
