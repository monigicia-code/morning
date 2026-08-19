import { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { translations } from './translations';
import type { Locale } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type TranslationKey = keyof (typeof translations)['en'];

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [locale, setLocaleState] = useState<Locale>('en');

  // Load locale from the user's profile once they are signed in
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('locale')
        .eq('id', session.user.id)
        .maybeSingle();
      if (!cancelled && data?.locale) {
        setLocaleState(data.locale);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const setLocale = useCallback(
    (l: Locale) => {
      setLocaleState(l);
      if (session) {
        supabase.from('profiles').update({ locale: l }).eq('id', session.user.id).then(() => {});
      }
    },
    [session]
  );

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const dict = translations[locale] as Record<string, string>;
      let str = dict[key] ?? (translations.en[key] as string) ?? (key as string);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        }
      }
      return str;
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function localizedCategoryName(
  cat: { name_en: string; name_zh: string } | undefined | null,
  locale: Locale
): string {
  if (!cat) return '';
  return locale === 'zh' ? cat.name_zh : cat.name_en;
}

export function localizedInterestName(
  interest: { name_en: string; name_zh: string } | undefined | null,
  locale: Locale
): string {
  if (!interest) return '';
  return locale === 'zh' ? interest.name_zh : interest.name_en;
}
