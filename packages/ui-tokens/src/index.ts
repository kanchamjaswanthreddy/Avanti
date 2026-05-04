// @avanti/ui-tokens — JS/TS token exports for React Native
// Web apps import the CSS files directly from tokens/*.css
// React Native uses these JS constants with StyleSheet.create()

export const colors = {
  brand: {
    50:  '#EEF2FF',
    100: '#C7D2FE',
    200: '#A5B4FC',
    500: '#1A3C6B',
    600: '#142F56',
    900: '#0A1A30',
  },
  accent: {
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  gray: {
    0:   '#FFFFFF',
    50:  '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    400: '#9CA3AF',
    600: '#4B5563',
    900: '#111827',
  },
  semantic: {
    success: '#059669',
    warning: '#D97706',
    error:   '#DC2626',
    info:    '#2563EB',
  },
} as const;

export const spacing = {
  0:  0,
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const radius = {
  sm:   6,
  md:   10,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

export const typography = {
  fontSans: 'Inter',   // React Native: load via expo-font or react-native-fonts
  fontMono: 'JetBrainsMono',
  size: {
    xs:   12,
    sm:   14,
    base: 16,
    lg:   18,
    xl:   20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weight: {
    normal:   '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
  },
} as const;

export const duration = {
  instant: 50,
  fast:    100,
  normal:  200,
  slow:    350,
  xslow:   500,
} as const;
