import { HeartHandshake } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import { OnboardingStep } from './_step';
import { View } from 'react-native';

export default function IntroStep() {
  const { theme } = useTheme();
  const { t } = useI18n();
  return (
    <OnboardingStep
      step={1}
      total={7}
      titleKey="onboarding.intro.title"
      bodyKey="onboarding.intro.body"
      nextHref="/(onboarding)/anonymity"
      nextLabelKey="onboarding.intro.start"
      icon={
        <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: theme.brandLight, alignItems: 'center', justifyContent: 'center' }}>
          <HeartHandshake size={44} color={theme.brand} />
        </View>
      }
    />
  );
}
