import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import en from './translations/en.json';
import ar from './translations/ar.json';
import hi from './translations/hi.json';
import bn from './translations/bn.json';
import ur from './translations/ur.json';

const translations = { en, ar, hi, bn, ur };

export const RTL_LANGS = new Set(['ar', 'ur']);

export const SUPPORTED_LANGS = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇴🇲' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
];

export const I18nContext = createContext();

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export default function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(
    () => localStorage.getItem('pp-lang') || 'en'
  );
  const isRTL = RTL_LANGS.has(locale);

  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', locale);
  }, [locale, isRTL]);

  const setLocale = useCallback((lang) => {
    setLocaleState(lang);
    localStorage.setItem('pp-lang', lang);
  }, []);

  const t = useCallback(
    (key, vars = {}) => {
      const keys = key.split('.');
      let value = translations[locale] || translations.en;
      for (const k of keys) value = value?.[k];
      // Fallback to English if key missing in current locale
      if (value === undefined) {
        let fallback = translations.en;
        for (const k of keys) fallback = fallback?.[k];
        value = fallback ?? key;
      }
      let result = value;
      if (typeof result === 'string') {
        Object.entries(vars).forEach(([k, v]) => {
          result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
        });
      }
      return result;
    },
    [locale]
  );

  const value = useMemo(() => ({ t, locale, setLocale, isRTL, lang: locale }), [t, locale, setLocale, isRTL]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
