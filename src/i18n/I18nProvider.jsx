import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import en from './translations/en.json';
import ar from './translations/ar.json';

const translations = { en, ar };
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
  const isRTL = locale === 'ar';

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
      let value = translations[locale];
      for (const k of keys) value = value?.[k];
      let result = value || key;
      Object.entries(vars).forEach(([k, v]) => {
        result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
      });
      return result;
    },
    [locale]
  );

  const value = useMemo(() => ({ t, locale, setLocale, isRTL }), [t, locale, setLocale, isRTL]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
