import { View, StyleSheet, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/lib/ThemeContext';
import { avatarColorFor } from '@/lib/theme';
import type { AnonymousIdentity } from '@/types/database';

interface AvatarProps {
  identity: Pick<AnonymousIdentity, 'display_code' | 'nickname' | 'avatar_seed' | 'avatar_color'> | null | undefined;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ identity, size = 44, style }: AvatarProps) {
  const { theme } = useTheme();
  const code = identity?.display_code ?? '?????';
  const label = identity?.nickname?.trim() || code;
  const initials = label.slice(0, 2).toUpperCase();
  const color = identity?.avatar_color || avatarColorFor(identity?.avatar_seed ?? code, theme);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={identity?.nickname ? `Avatar: ${identity.nickname}` : `Anonymous ${code}`}
    >
      <ThemedText
        style={{
          color: theme.textInverse,
          fontSize: size * 0.38,
          fontFamily: 'Inter-Bold',
          lineHeight: size * 0.42,
        }}
      >
        {initials}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
