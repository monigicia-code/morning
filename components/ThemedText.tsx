import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface ThemedTextProps extends TextProps {
  variant?: 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'tertiary' | 'brand' | 'inverse' | 'error' | 'success' | 'warning';
}

export function ThemedText({ variant = 'body', color = 'primary', style, children, ...rest }: ThemedTextProps) {
  const { theme } = useTheme();
  const colorMap: Record<string, string> = {
    primary: theme.text,
    secondary: theme.textSecondary,
    tertiary: theme.textTertiary,
    brand: theme.brand,
    inverse: theme.textInverse,
    error: theme.error,
    success: theme.success,
    warning: theme.warning,
  };
  const textStyle = styles[variant];
  return (
    <Text style={[textStyle, { color: colorMap[color] }, style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  display: { fontSize: 30, fontFamily: 'Inter-Bold', lineHeight: 36, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontFamily: 'Inter-Bold', lineHeight: 30, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontFamily: 'Inter-SemiBold', lineHeight: 26 },
  h3: { fontSize: 17, fontFamily: 'Inter-SemiBold', lineHeight: 23 },
  body: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 22 },
  bodySmall: { fontSize: 13, fontFamily: 'Inter-Regular', lineHeight: 19 },
  caption: { fontSize: 12, fontFamily: 'Inter-Regular', lineHeight: 17 },
  label: { fontSize: 13, fontFamily: 'Inter-Medium', lineHeight: 18 },
});
