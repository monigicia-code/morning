import { ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { OnboardingStep } from './_step';
import { View } from 'react-native';

export default function VerificationStep() {
  const { theme } = useTheme();
  return (
    <OnboardingStep
      step={3}
      total={7}
      titleKey="onboarding.verify.title"
      bodyKey="onboarding.verify.body"
      nextHref="/(onboarding)/safety"
      icon={
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: theme.brandLight, alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={44} color={theme.brand} />
        </View>
      }
    />
  );
}
