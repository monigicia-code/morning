export const lightTheme = {
  mode: 'light' as const,
  // Brand accent: warm teal — trustworthy, calm, human
  brand: '#2E7D6B',
  brandDark: '#1F5A4D',
  brandLight: '#E6F2EE',
  brandMuted: '#5BA392',
  // Backgrounds
  bg: '#F7F8F6',
  bgElevated: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgSubtle: '#EFF1ED',
  bgInput: '#F2F4F0',
  // Text
  text: '#1A1F1D',
  textSecondary: '#5A6661',
  textTertiary: '#8A958F',
  textInverse: '#FFFFFF',
  // Borders / dividers
  border: '#E2E6E1',
  borderStrong: '#CDD3CB',
  // Status
  success: '#2E8B57',
  successBg: '#E6F4EC',
  warning: '#C77700',
  warningBg: '#FBF1DE',
  error: '#C0392B',
  errorBg: '#F8E6E4',
  info: '#2D6A9F',
  infoBg: '#E4EEF7',
  // Avatar palette (calm, varied, non-purple)
  avatarPalette: ['#2E7D6B', '#3D7BA0', '#8B6B3D', '#A04B5B', '#4B7A3D', '#6B5B8B', '#B07B3D', '#3D7B7B'],
};

export const darkTheme = {
  mode: 'dark' as const,
  brand: '#4FAA93',
  brandDark: '#5FC4A9',
  brandLight: '#1B3A33',
  brandMuted: '#7BC4B2',
  bg: '#0F1311',
  bgElevated: '#171D1A',
  bgCard: '#1A201D',
  bgSubtle: '#141A17',
  bgInput: '#1F2622',
  text: '#ECEFEC',
  textSecondary: '#A9B5AE',
  textTertiary: '#748079',
  textInverse: '#0F1311',
  border: '#2A322E',
  borderStrong: '#3A443E',
  success: '#4FBE7E',
  successBg: '#15281E',
  warning: '#E0A53D',
  warningBg: '#2A2214',
  error: '#E07065',
  errorBg: '#2A1715',
  info: '#5BA0D6',
  infoBg: '#152433',
  avatarPalette: ['#4FAA93', '#5B9BC7', '#B98E5B', '#C46E7E', '#6FA05B', '#8B7BB0', '#C4955B', '#5B9B9B'],
};

export type Theme = typeof lightTheme;

export function avatarColorFor(seed: string, theme: Theme): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const palette = theme.avatarPalette;
  return palette[Math.abs(hash) % palette.length];
}
