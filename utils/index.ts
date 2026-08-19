import { useI18n } from '@/i18n/I18nContext';

export function useTimeAgo() {
  const { t } = useI18n();
  return (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return t('misc.justNow');
    const min = Math.floor(sec / 60);
    if (min < 60) return t('misc.minutesAgo', { count: min });
    const hr = Math.floor(min / 60);
    if (hr < 24) return t('misc.hoursAgo', { count: hr });
    const day = Math.floor(hr / 24);
    if (day < 30) return t('misc.daysAgo', { count: day });
    return date.toLocaleDateString();
  };
}

// Heuristic detection of personal info in post/comment text.
// Warns the user; never silently modifies content.
const PATTERNS = {
  phone: /(\+?\d[\d\s\-().]{7,}\d)/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // crude address heuristic (street + number)
  address: /\b\d{1,5}\s+[A-Z][a-zA-Z]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Way|Court|Ct)\b/g,
  idNumber: /\b\d{15,18}\b/g,
  bankAccount: /\b\d{10,17}\b/g,
  password: /\b(password|密码)\b[:：]?\s*\S+/gi,
};

export interface DoxxingMatch {
  type: keyof typeof PATTERNS;
  snippet: string;
}

export function detectDoxxing(text: string): DoxxingMatch[] {
  const matches: DoxxingMatch[] = [];
  for (const [type, pattern] of Object.entries(PATTERNS) as [keyof typeof PATTERNS, RegExp][]) {
    const found = text.match(pattern);
    if (found && found.length > 0) {
      matches.push({ type, snippet: found[0] });
    }
  }
  return matches;
}

export function hasDoxxingRisk(text: string): boolean {
  return detectDoxxing(text).length > 0;
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + 'k';
  return (n / 1_000_000).toFixed(1) + 'M';
}
