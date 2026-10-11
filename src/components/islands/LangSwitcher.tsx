import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { LANGUAGE_NAMES, RTL_CODES } from '@/i18n/names.mjs';
import { HREFLANG } from '@/i18n/hreflang.mjs';

/* NO FLAGS.
   The desktop switcher used to carry a raster country flag: ~20px of red and
   blue noise, the only muddy multi-colour object in an otherwise purely
   typographic nav bar. It was also wrong on its own terms: a flag names a
   COUNTRY, not a language, and this product's headline is "the ERP that speaks
   your language", so 🇬🇧 for English, 🇵🇰 for Urdu and 🇧🇩 for Bengali each
   claimed a nationality for a language several nations share. Every entry now
   names itself in its own script, which is the only label that is true, and the
   control takes one stroked globe in the nav's own ink. Same glyph as the EN
   chip inside the hero mock, so the page states the idea once.

   SEARCHABLE LIST.
   With up to 52 languages a plain menu is a wall. The panel opens on a search
   field that filters by the native name, the English name or the code, and
   ignores accents (so "francais" finds Français). Below it is a plain list of
   real links: middle-click, copy-link and screen readers all work, and nothing
   nests an interactive element inside an ARIA widget. Keyboard: Arrow Down
   from the field moves into the list, Arrow Up/Down walk it, Home/End jump,
   typing anywhere returns to the field, Enter in the field follows the first
   match, Escape closes and returns focus to the button.

   Each entry links to the SAME page in that language when it exists there, and
   to that language's home page when it does not, so the switcher never sends
   anyone to a URL that was not built. The server passes the two code lists;
   the names come from names.mjs, which carries no dictionaries. */

const NAMES = LANGUAGE_NAMES as Record<string, [string, string]>;
const TAGS = HREFLANG as Record<string, string>;
const RTL = new Set<string>(RTL_CODES);

/** Lowercase and strip combining marks, so a filter ignores accents. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const Globe = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
  </svg>
);

interface Props {
  /** The page's own locale. */
  locale: string;
  /** The page's default-locale path, trailing-slashed (e.g. "/pricing/"). */
  path: string;
  /** Live locale codes, space-separated. */
  live: string;
  /** Codes of the locales in which THIS page exists, space-separated. */
  available: string;
  /** `popover` floats under the button (desktop); `inline` opens in flow (mobile menu). */
  variant?: 'popover' | 'inline';
}

function hrefFor(code: string, path: string, available: string[]): string {
  const target = available.includes(code) ? path : '/';
  if (code === 'en') return target;
  return target === '/' ? `/${code}/` : `/${code}${target}`;
}

export default function LangSwitcher({ locale, path, live: liveList, available: availableList, variant = 'popover' }: Props) {
  const live = useMemo(() => liveList.split(' ').filter(Boolean), [liveList]);
  const available = useMemo(() => availableList.split(' ').filter(Boolean), [availableList]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const uid = useId();
  const panelId = `lang-panel-${uid}`;
  const statusId = `lang-status-${uid}`;

  const current = NAMES[locale] ?? NAMES.en;

  const options = useMemo(
    () =>
      live
        .filter((code) => NAMES[code])
        .map((code) => ({
          code,
          label: NAMES[code][0],
          english: NAMES[code][1],
          href: hrefFor(code, path, available),
          key: fold(`${NAMES[code][0]} ${NAMES[code][1]} ${code}`),
        }))
        .sort((a, b) => a.english.localeCompare(b.english, 'en')),
    [live, path, available]
  );

  const q = fold(query.trim());
  const shown = q ? options.filter((o) => o.key.includes(q)) : options;

  const close = (refocus: boolean) => {
    setOpen(false);
    setQuery('');
    if (refocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const links = () => Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []);

  const onPanelKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
      return;
    }
    const items = links();
    const idx = items.indexOf(document.activeElement as HTMLAnchorElement);
    const inField = document.activeElement === inputRef.current;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      (inField ? items[0] : items[Math.min(idx + 1, items.length - 1)])?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx <= 0) inputRef.current?.focus();
      else items[idx - 1]?.focus();
    } else if ((e.key === 'Home' || e.key === 'End') && !inField) {
      e.preventDefault();
      (e.key === 'Home' ? items[0] : items[items.length - 1])?.focus();
    } else if (e.key === 'Enter' && inField) {
      e.preventDefault();
      if (shown[0]) window.location.href = shown[0].href;
    } else if (!inField && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      inputRef.current?.focus();
    }
  };

  const onBlurWithin = (e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && rootRef.current && !rootRef.current.contains(next)) close(false);
  };

  const panelClass =
    variant === 'popover'
      ? 'absolute end-0 top-full mt-1 z-50 w-[min(19rem,calc(100vw-2rem))] bg-white rounded-xl shadow-2xl shadow-ink-500/10 border border-cream-200 p-2'
      : 'mt-2 w-full max-w-sm bg-white rounded-xl border border-cream-200 p-2';

  return (
    <div className={variant === 'popover' ? 'relative' : ''} ref={rootRef} onBlur={onBlurWithin}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close(false) : setOpen(true))}
        className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[44px] text-sm font-medium text-ink-500/75 hover:text-ink-500 rounded-lg transition-colors"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <Globe className="h-4 w-4 opacity-70 shrink-0" />
        {/* The accessible name CONTAINS the visible label (WCAG 2.5.3). */}
        <span className="sr-only">Change language: </span>
        <span lang={TAGS[locale]} className="whitespace-nowrap">{current[0]}</span>
        <svg className="w-3.5 h-3.5 opacity-60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div id={panelId} className={panelClass} onKeyDown={onPanelKey} role="group" aria-label="Languages">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search languages"
            aria-label="Search languages"
            aria-describedby={statusId}
            aria-controls={`${panelId}-list`}
            autoComplete="off"
            spellCheck={false}
            dir="auto"
            className="w-full rounded-lg border border-cream-200 bg-cream-50 px-3 py-2 text-sm text-ink-500 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-copper-500"
          />
          <p id={statusId} className="sr-only" aria-live="polite">
            {shown.length === 1 ? '1 language' : `${shown.length} languages`}
          </p>
          <ul
            id={`${panelId}-list`}
            ref={listRef}
            className={`mt-1.5 overflow-y-auto overscroll-contain ${variant === 'popover' ? 'max-h-[min(22rem,60vh)]' : 'max-h-72'}`}
          >
            {shown.map((o) => {
              const isCurrent = o.code === locale;
              return (
                <li key={o.code}>
                  <a
                    href={o.href}
                    hrefLang={TAGS[o.code]}
                    lang={TAGS[o.code]}
                    aria-current={isCurrent ? 'true' : undefined}
                    className={`flex items-baseline justify-between gap-3 w-full px-3 py-2 min-h-[44px] text-sm rounded-lg no-underline transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 ${
                      isCurrent ? 'bg-cream-50 text-ink-500 font-semibold' : 'text-ink-500/80 hover:bg-cream-50 focus:bg-cream-50'
                    }`}
                  >
                    <span dir={RTL.has(o.code) ? 'rtl' : 'ltr'} className="min-w-0 truncate">{o.label}</span>
                    {o.english !== o.label && (
                      <span lang="en" dir="ltr" className="shrink-0 text-xs text-ink-400">{o.english}</span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
          {shown.length === 0 && (
            <p className="px-3 py-3 text-sm text-ink-400" lang="en">No language matches “{query}”.</p>
          )}
        </div>
      )}
    </div>
  );
}
