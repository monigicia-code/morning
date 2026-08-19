import { View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, style, padded = true }: CardProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.bgCard,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
        },
        padded && { padding: 16 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
});
