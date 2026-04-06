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
    <section className="py-24 px-6 lg:px-10 bg-cream-50 border-y border-cream-200">
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Left: copy */}
          <div>
            <p className="text-xs font-semibold text-copper-400 tracking-widest uppercase mb-3">{t('languages.eyebrow')}</p>
            <h2 className="font-display text-4xl lg:text-5xl font-bold text-ink-500 leading-tight mb-4">
              {t('languages.title')}
            </h2>
            <p className="text-ink-500/60 text-lg leading-relaxed mb-8">{t('languages.sub')}</p>

            <div className="flex flex-wrap gap-2">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setActive(l.code)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                    active === l.code
                      ? 'bg-ink-500 text-cream-50 border-ink-500 shadow-md'
                      : 'bg-white text-ink-400 border-cream-200 hover:border-ink-300 hover:text-ink-500'
                  }`}
                >
                  <span className="text-lg leading-none">{l.flag}</span>
                  <span>{l.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: UI preview */}
          <div className="relative">
            <div
              dir={lang.dir}
              className="bg-white rounded-2xl border border-cream-200 shadow-xl overflow-hidden transition-all"
            >
              {/* Mock window chrome */}
              <div className="bg-ink-500 px-5 py-3 flex items-center justify-between">
                <span className="text-cream-50 text-xs font-semibold opacity-80">Paper & Pen ERP</span>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cream-50/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-cream-50/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-copper-400/80" />
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-ink-500 flex items-center justify-center text-cream-50 font-bold text-sm shrink-0">P</div>
                  <div>
                    <p className="text-xs text-ink-300 mb-0.5">Paper & Pen ERP</p>
                    <p className={`text-sm font-semibold text-ink-500 ${lang.dir === 'rtl' ? 'font-arabic' : ''}`}>{lang.sample}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  <div className="h-2 bg-ink-100 rounded-full w-full" />
                  <div className="h-2 bg-cream-200 rounded-full w-4/5" />
                  <div className="h-2 bg-cream-100 rounded-full w-2/3" />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[60, 85, 45].map((w, i) => (
                    <div key={i} className="bg-cream-50 border border-cream-100 rounded-lg p-3">
                      <div className="h-1.5 bg-cream-200 rounded mb-2" style={{ width: `${w}%` }} />
                      <div className="h-4 bg-ink-100 rounded" />
                    </div>
                  ))}
                </div>

                <div className={`flex gap-2 ${lang.dir === 'rtl' ? 'justify-start' : 'justify-end'}`}>
                  <div className="px-4 py-1.5 bg-ink-500 text-cream-50 text-xs rounded-lg font-medium">
                    {lang.dir === 'rtl' ? 'حفظ' : 'Save'}
                  </div>
                  <div className="px-4 py-1.5 bg-cream-100 border border-cream-200 text-ink-400 text-xs rounded-lg">
                    {lang.dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating lang indicator */}
            <div className="absolute -bottom-4 -right-4 bg-white rounded-xl px-4 py-2.5 shadow-lg border border-cream-200 flex items-center gap-2">
              <span className="text-xl">{lang.flag}</span>
              <span className="text-sm font-semibold text-ink-500">{lang.name}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
