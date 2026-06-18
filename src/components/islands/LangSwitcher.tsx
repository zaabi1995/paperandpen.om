import { useState } from 'react';

const LOCALES = ['en', 'ar', 'hi', 'bn', 'ur'] as const;
type Locale = (typeof LOCALES)[number];

const META: Record<Locale, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇬🇧' },
  ar: { label: 'العربية', flag: '🇴🇲' },
  hi: { label: 'हिन्दी', flag: '🇮🇳' },
  bn: { label: 'বাংলা', flag: '🇧🇩' },
  ur: { label: 'اردو', flag: '🇵🇰' },
};

function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}

/** Compute the equivalent path under a different locale (en = no prefix). */
function switchPath(pathname: string, target: Locale): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] && isLocale(parts[0])) parts.shift();
  const base = '/' + parts.join('/');
  return target === 'en' ? base || '/' : `/${target}${base === '/' ? '' : base}`;
}

export default function LangSwitcher({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false);
  const current = META[locale] ?? META.en;

  const go = (target: Locale) => {
    if (typeof window === 'undefined') return;
    window.location.pathname = switchPath(window.location.pathname, target);
  };

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-ink-500/75 hover:text-ink-500 rounded-lg transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Change language"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span>{current.label}</span>
        <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul
          className="absolute end-0 mt-1 w-44 bg-white rounded-xl shadow-2xl shadow-ink-500/10 border border-cream-200 p-1.5 z-50"
          role="listbox"
        >
          {LOCALES.map((loc) => (
            <li key={loc}>
              <button
                type="button"
                onClick={() => go(loc)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg transition-colors text-start ${
                  loc === locale ? 'bg-cream-50 text-ink-500 font-semibold' : 'text-ink-500/75 hover:bg-cream-50'
                }`}
                role="option"
                aria-selected={loc === locale}
              >
                <span className="text-base leading-none">{META[loc].flag}</span>
                <span>{META[loc].label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
