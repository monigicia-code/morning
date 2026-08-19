import { Eye, ShieldCheck, Users } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { OnboardingStep } from './_step';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

export default function AnonymityStep() {
  const { theme } = useTheme();
  return (
    <OnboardingStep
      step={2}
      total={7}
      titleKey="onboarding.anon.title"
      bodyKey="onboarding.anon.body"
      nextHref="/(onboarding)/verification"
      icon={
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {[Eye, ShieldCheck, Users].map((Icon, i) => (
            <View key={i} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.brandLight, alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={28} color={theme.brand} />
            </View>
          ))}
        </View>
      }
    />
  );
}
