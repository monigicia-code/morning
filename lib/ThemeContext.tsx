import { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { lightTheme, darkTheme, Theme } from './theme';
import { supabase } from './supabase';
import { useAuth } from '@/hooks/useAuth';
import type { ThemePreference } from '@/types/database';

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('theme_preference')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!cancelled && data?.theme_preference) {
        setPreferenceState(data.theme_preference);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const isDark = preference === 'dark' || (preference === 'system' && systemScheme === 'dark');
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    if (session) {
      supabase.from('profiles').update({ theme_preference: p }).eq('id', session.user.id).then(() => {});
    }
  };

  const value = useMemo(
    () => ({ theme, preference, isDark, setPreference }),
    [theme, preference, isDark]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
