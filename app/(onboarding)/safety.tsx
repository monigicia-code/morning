import { Flag, ShieldAlert } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { OnboardingStep } from './_step';
import { View } from 'react-native';

export default function SafetyStep() {
  const { theme } = useTheme();
  return (
    <OnboardingStep
      step={4}
      total={7}
      titleKey="onboarding.safety.title"
      bodyKey="onboarding.safety.body"
      nextHref="/(onboarding)/legal"
      icon={
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {[Flag, ShieldAlert].map((Icon, i) => (
            <View key={i} style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.brandLight, alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={32} color={theme.brand} />
            </View>
          ))}
        </View>
      }
    />
  );
}
