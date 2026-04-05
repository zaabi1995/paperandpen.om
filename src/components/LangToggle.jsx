import { useI18n } from '@/i18n/I18nProvider';
export default function LangToggle() {
  const { locale, setLocale } = useI18n();
  const other = locale === 'en' ? 'ar' : 'en';
  const label = locale === 'en' ? 'عربي' : 'English';
  return (
    <button onClick={() => setLocale(other)} className="text-sm font-medium text-brand-500 hover:text-brand-600 border border-brand-500 rounded-md px-3 py-1 transition-colors">
      {label}
    </button>
  );
}
