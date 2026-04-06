import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import en from './translations/en.json';
import ar from './translations/ar.json';
import hi from './translations/hi.json';
import bn from './translations/bn.json';
import ur from './translations/ur.json';

const translations = { en, ar, hi, bn, ur };
const DEFAULT_LOCALE = 'en';
const TRANSLATION_KEY_PATTERN = /^[a-z0-9_.-]+$/i;

export const RTL_LANGS = new Set(['ar', 'ur']);

export const SUPPORTED_LANGS = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇴🇲' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
];
export const SUPPORTED_LOCALE_CODES = new Set(SUPPORTED_LANGS.map(({ code }) => code));

export const I18nContext = createContext();

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

function sanitizeLocale(value) {
  return SUPPORTED_LOCALE_CODES.has(value) ? value : DEFAULT_LOCALE;
}

function readStoredLocale() {
  try {
    return sanitizeLocale(localStorage.getItem('pp-lang'));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export default function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => readStoredLocale());
  const isRTL = RTL_LANGS.has(locale);

  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', locale);
  }, [locale, isRTL]);

  const setLocale = useCallback((lang) => {
    const nextLocale = sanitizeLocale(lang);
    setLocaleState(nextLocale);
    try {
      localStorage.setItem('pp-lang', nextLocale);
    } catch {
      console.warn('Unable to persist locale preference.');
    }
  }, []);

  const t = useCallback(
    (key, vars = {}) => {
      if (typeof key !== 'string' || !TRANSLATION_KEY_PATTERN.test(key)) {
        return '';
      }

      const keys = key.split('.');
      const activeLocale = sanitizeLocale(locale);
      let value = translations[activeLocale] || translations[DEFAULT_LOCALE];
      for (const k of keys) value = value?.[k];
      // Fallback to English if key missing in current locale
      if (value === undefined) {
        let fallback = translations[DEFAULT_LOCALE];
        for (const k of keys) fallback = fallback?.[k];
        value = fallback ?? key;
      }
      let result = value;
      if (typeof result === 'string') {
        Object.entries(vars).forEach(([k, v]) => {
          result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        });
      }
      return result;
    },
    [locale]
  );

  const value = useMemo(() => ({ t, locale, setLocale, isRTL, lang: locale }), [t, locale, setLocale, isRTL]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
