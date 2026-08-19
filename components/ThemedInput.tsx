import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface ThemedInputProps extends TextInputProps {
  multiline?: boolean;
}

export function ThemedInput(props: ThemedInputProps) {
  const { theme } = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textTertiary}
      style={[
        styles.input,
        {
          backgroundColor: theme.bgInput,
          color: theme.text,
          borderColor: theme.border,
        },
        props.multiline && { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },
        props.style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    minHeight: 48,
  },
});
