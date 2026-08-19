import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  PressableProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ThemedText } from './ThemedText';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();

  const baseStyle: ViewStyle = {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: size === 'sm' ? 8 : size === 'lg' ? 16 : 12,
    paddingHorizontal: size === 'sm' ? 14 : size === 'lg' ? 24 : 18,
    minHeight: size === 'lg' ? 52 : size === 'sm' ? 36 : 44,
  };

  const variantStyles: Record<string, ViewStyle> = {
    primary: { backgroundColor: theme.brand },
    secondary: { backgroundColor: theme.brandLight },
    ghost: { backgroundColor: 'transparent' },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.borderStrong },
    danger: { backgroundColor: theme.error },
  };

  const textColorMap: Record<string, string> = {
    primary: theme.textInverse,
    secondary: theme.brandDark,
    ghost: theme.brand,
    outline: theme.text,
    danger: '#FFFFFF',
  };

  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 15;

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        baseStyle,
        variantStyles[variant],
        fullWidth && { width: '100%' },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColorMap[variant]} size="small" />
      ) : (
        <ThemedText
          style={{
            color: textColorMap[variant],
            fontSize,
            fontFamily: 'Inter-SemiBold',
          }}
        >
          {children}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({});
