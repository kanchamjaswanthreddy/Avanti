// Vidyut i18n — Locale configuration
// Supported locales: English, Hindi, Telugu, Tamil, Kannada, Marathi

export const LOCALES = ['en', 'hi', 'te', 'ta', 'kn', 'mr'] as const;
export type Locale = typeof LOCALES[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
  te: 'తెలుగు',
  ta: 'தமிழ்',
  kn: 'ಕನ್ನಡ',
  mr: 'मराठी',
};

export function isValidLocale(locale: string): locale is Locale {
  return (LOCALES as readonly string[]).includes(locale);
}
