import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

export default function Index() {
  const { session, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { theme } = useTheme();

  if (loading || (session && profileLoading)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.brand} size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!profile?.onboarding_completed_at) {
    return <Redirect href="/(onboarding)/intro" />;
  }

  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
