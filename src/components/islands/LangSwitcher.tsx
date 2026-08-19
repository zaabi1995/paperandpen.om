import { useState } from 'react';

const LOCALES = ['en', 'ar', 'hi', 'bn', 'ur'] as const;
type Locale = (typeof LOCALES)[number];

/* NO FLAGS.
   The desktop switcher used to carry a raster country flag: ~20px of red and
   blue noise, the only muddy multi-colour object in an otherwise purely
   typographic nav bar. It was also wrong on its own terms — a flag names a
   COUNTRY, not a language, and this product's headline is "the ERP that speaks
   your language", so 🇬🇧 for English, 🇵🇰 for Urdu and 🇧🇩 for Bengali each
   claimed a nationality for a language several nations share. Every entry now
   names itself in its own script, which is the only label that is true, and the
   control takes one stroked globe in the nav's own ink. Same glyph as the EN
   chip inside the hero mock, so the page states the idea once. */
const META: Record<Locale, { label: string }> = {
  en: { label: 'English' },
  ar: { label: 'العربية' },
  hi: { label: 'हिन्दी' },
  bn: { label: 'বাংলা' },
  ur: { label: 'اردو' },
};

const Globe = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
  </svg>
);

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
        <Globe className="h-4 w-4 opacity-70" />
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
                <span>{META[loc].label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
