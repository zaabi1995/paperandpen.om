import en from './ui/en.json';
import ar from './ui/ar.json';
import hi from './ui/hi.json';
import bn from './ui/bn.json';
import ur from './ui/ur.json';
import { HREFLANG as HL } from './hreflang.mjs';

export const DEFAULT_LOCALE = 'en';
export const LOCALES = ['en', 'ar', 'hi', 'bn', 'ur'] as const;
export type Locale = (typeof LOCALES)[number];

export const RTL_LOCALES = new Set<Locale>(['ar', 'ur']);

/*
 * og:locale, <html lang> and hreflang codes.
 *
 * `htmlLang` and `hreflang` are SEPARATE fields on purpose and must stay that way.
 * `htmlLang` feeds the <html lang> attribute (a document-language declaration for
 * assistive tech and the UA); `hreflang` feeds the alternate annotations in BOTH
 * the page <head> AND the sitemap. Before r375 the sitemap took its codes from a
 * second, independent map in astro.config.mjs (ar-OM / hi-IN / bn-BD / ur-PK) while
 * getAlternates() below emitted htmlLang (ar / hi / bn / ur), so every one of 315
 * URL pairs carried two contradictory annotation sets and the sitemap omitted the
 * x-default the pages declared. One field, read by both, is the whole fix.
 *
 * The codes are BARE LANGUAGE, no region, deliberately:
 *  - `ar-OM` narrows Arabic to Oman alone. The Arabic pages carry no Oman-only
 *    pricing, law or copy, the H1 says "for businesses everywhere", and the
 *    audience it would exclude (AE, SA, BH, QA, KW) is the majority of the Gulf
 *    Arabic market this site is written for.
 *  - `bn-BD` excludes the ~90m Bengali speakers in India; `ur-PK` excludes Urdu
 *    readers outside Pakistan; and the real hi/bn/ur audience for a GCC business
 *    tool is the Gulf expatriate workforce, who are in OM/AE/SA, not IN/BD/PK.
 *    A region subtag is a targeting NARROWING, never a hint, so none is correct here.
 * A bare code also matches the `lang` the documents already declare, so the two
 * annotations agree by construction.
 */
export const LOCALE_META: Record<
  Locale,
  { label: string; flag: string; ogLocale: string; htmlLang: string; hreflang: string }
> = {
  en: { label: 'English', flag: '🇬🇧', ogLocale: 'en_US', htmlLang: 'en', hreflang: HL.en },
  ar: { label: 'العربية', flag: '🇴🇲', ogLocale: 'ar_OM', htmlLang: 'ar', hreflang: HL.ar },
  hi: { label: 'हिन्दी', flag: '🇮🇳', ogLocale: 'hi_IN', htmlLang: 'hi', hreflang: HL.hi },
  bn: { label: 'বাংলা', flag: '🇧🇩', ogLocale: 'bn_BD', htmlLang: 'bn', hreflang: HL.bn },
  ur: { label: 'اردو', flag: '🇵🇰', ogLocale: 'ur_PK', htmlLang: 'ur', hreflang: HL.ur },
};

export { HREFLANG } from './hreflang.mjs';

const dictionaries: Record<Locale, Record<string, unknown>> = { en, ar, hi, bn, ur };

const KEY_PATTERN = /^[a-z0-9_.-]+$/i;

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.has(locale);
}

/** Read the active locale from a URL pathname (first segment). Defaults to 'en'. */
export function getLocaleFromUrl(url: URL): Locale {
  const seg = url.pathname.split('/').filter(Boolean)[0];
  return isLocale(seg) ? seg : DEFAULT_LOCALE;
}

/** Remove a leading locale segment from a pathname, returning a default-locale path. */
export function stripLocale(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (isLocale(parts[0])) parts.shift();
  return '/' + parts.join('/');
}

/** Prefix a default-locale path with the locale segment (en stays at root). Always trailing-slashed. */
export function localizePath(path: string, locale: Locale): string {
  const clean = '/' + path.replace(/^\/+/, '').replace(/\/+$/, '');
  const base = clean === '/' ? '' : clean;
  const localized = locale === DEFAULT_LOCALE ? base : `/${locale}${base}`;
  if (localized === '') return '/';
  return localized.endsWith('/') ? localized : localized + '/';
}

/** Build the hreflang alternates (5 locales + x-default) for a given default-locale path. */
export function getAlternates(
  path: string,
  locales: readonly Locale[] = LOCALES
): { hreflang: string; href: string }[] {
  const SITE = 'https://paperandpen.om';
  const selected = [...new Set(locales)];
  const list = selected.map((loc) => ({
    hreflang: LOCALE_META[loc].hreflang,
    href: SITE + localizePath(path, loc),
  }));
  list.push({ hreflang: 'x-default', href: SITE + localizePath(path, DEFAULT_LOCALE) });
  return list;
}

function lookup(dict: Record<string, unknown> | undefined, keys: string[]): unknown {
  let value: unknown = dict;
  for (const k of keys) {
    if (value && typeof value === 'object') value = (value as Record<string, unknown>)[k];
    else return undefined;
  }
  return value;
}

/** Returns a translator bound to a locale, with English fallback and {{var}} interpolation. */
export function useTranslations(locale: Locale) {
  const active = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return function t(key: string, vars: Record<string, string | number> = {}): string {
    if (typeof key !== 'string' || !KEY_PATTERN.test(key)) return '';
    const keys = key.split('.');
    let value = lookup(dictionaries[active], keys);
    if (value === undefined) value = lookup(dictionaries[DEFAULT_LOCALE], keys);
    if (value === undefined) return key;
    let result = String(value);
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
    return result;
  };
}

/** Raw lookup (for arrays/objects in the dictionary, e.g. feature lists). */
export function tRaw(locale: Locale, key: string): unknown {
  const active = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const keys = key.split('.');
  const value = lookup(dictionaries[active], keys);
  return value !== undefined ? value : lookup(dictionaries[DEFAULT_LOCALE], keys);
}
