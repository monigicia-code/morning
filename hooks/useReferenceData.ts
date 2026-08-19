import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { HelpCategory, Interest } from '@/types/database';
import { useI18n } from '@/i18n/I18nContext';

export function useHelpCategories() {
  const { locale } = useI18n();
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('help_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!active) return;
      if (error) setError(error.message);
      else setCategories((data ?? []) as HelpCategory[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { categories, loading, error, locale };
}

export function useInterests() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('interests')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!active) return;
      if (error) setError(error.message);
      else setInterests((data ?? []) as Interest[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { interests, loading, error };
}
