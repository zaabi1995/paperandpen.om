import { useState } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
const LANGS = [
  { code: 'ar', flag: '🇴🇲', name: 'العربية', dir: 'rtl', sample: 'مرحباً، هذا نظام ERP الخاص بك' },
  { code: 'en', flag: '🇬🇧', name: 'English', dir: 'ltr', sample: 'Welcome to your ERP system' },
  { code: 'hi', flag: '🇮🇳', name: 'हिन्दी', dir: 'ltr', sample: 'आपके ERP सिस्टम में आपका स्वागत है' },
  { code: 'bn', flag: '🇧🇩', name: 'বাংলা', dir: 'ltr', sample: 'আপনার ERP সিস্টেমে স্বাগতম' },
  { code: 'ur', flag: '🇵🇰', name: 'اردو', dir: 'rtl', sample: 'آپ کے ERP سسٹم میں خوش آمدید' },
];
export default function LanguageShowcaseSection() {
  const { t } = useI18n();
  const [active, setActive] = useState('ar');
  const lang = LANGS.find((l) => l.code === active);
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{t('languages.title')}</h2>
        <p className="text-gray-500 mb-12">{t('languages.sub')}</p>
        <div className="flex justify-center gap-3 flex-wrap mb-10">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => setActive(l.code)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${active === l.code ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300'}`}>
              <span className="text-lg">{l.flag}</span><span>{l.name}</span>
            </button>
          ))}
        </div>
        <div dir={lang.dir} className="max-w-lg mx-auto bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-2xl p-6 shadow-sm text-start">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm">P</div>
            <div>
              <p className="text-xs text-gray-400">Paper &amp; Pen ERP</p>
              <p className="text-sm font-semibold text-gray-800">{lang.sample}</p>
            </div>
          </div>
          <div className="h-2 bg-brand-200 rounded-full w-3/4 mb-2" />
          <div className="h-2 bg-gray-200 rounded-full w-1/2" />
          <div className="mt-4 flex gap-2 justify-end">
            <div className="px-3 py-1 bg-brand-500 text-white text-xs rounded-md">{lang.dir === 'rtl' ? 'حفظ' : 'Save'}</div>
            <div className="px-3 py-1 bg-white border text-xs rounded-md text-gray-600">{lang.dir === 'rtl' ? 'إلغاء' : 'Cancel'}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
