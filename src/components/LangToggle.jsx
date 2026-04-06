import { useState, useRef, useEffect } from 'react';
import { useI18n, SUPPORTED_LANGS } from '@/i18n/I18nProvider';

export default function LangToggle() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = SUPPORTED_LANGS.find(l => l.code === locale) || SUPPORTED_LANGS[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500/70 hover:text-ink-500 border border-cream-200 hover:border-ink-300 rounded-lg px-3 py-1.5 transition-all bg-white/50"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 bg-white border border-cream-200 rounded-xl shadow-xl overflow-hidden z-50 min-w-[140px]">
          {SUPPORTED_LANGS.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLocale(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                locale === lang.code
                  ? 'bg-ink-50 text-ink-500 font-semibold'
                  : 'text-ink-400 hover:bg-cream-50 hover:text-ink-500'
              }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
