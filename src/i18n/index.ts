import { HREFLANG as HL, LOCALE_CODES, CORE_LOCALES as CORE } from './hreflang.mjs';
import { contentFilesOnDisk, CONTENT_ROUTES, GLOSSARY_ROUTE } from './live.mjs';
import { LANGUAGE_NAMES, RTL_CODES } from './names.mjs';

export const DEFAULT_LOCALE = 'en';

/** Every locale in the table, live or not. The type covers all of them. */
export const ALL_LOCALES = LOCALE_CODES as readonly Locale[];
export type Locale =
  | 'en' | 'ar' | 'hi' | 'bn' | 'ur'
  | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'nl' | 'ru' | 'uk' | 'pl' | 'cs' | 'sk' | 'bg'
  | 'tr' | 'fa' | 'he' | 'el' | 'ro' | 'hu' | 'zh' | 'zh-hant' | 'ja' | 'ko' | 'vi'
  | 'th' | 'id' | 'ms' | 'tl' | 'sw' | 'sv' | 'no' | 'da' | 'fi' | 'et' | 'lv' | 'lt'
  | 'sl' | 'hr' | 'sr' | 'ca' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'gu' | 'pa' | 'or';

/** The five launch locales. See CORE_LOCALES in ./hreflang.mjs. */
export const CORE_LOCALES = CORE as readonly Locale[];

/*
 * LIVE locales are data-driven: a locale is live when its UI dictionary
 * src/i18n/ui/<code>.json exists. The glob is eager so the dictionaries are in
 * the bundle; there is no hand-maintained import list to forget to extend.
 */
const dictionaryModules = import.meta.glob<Record<string, unknown>>('./ui/*.json', {
  eager: true,
  import: 'default',
});
const dictionaries = new Map<Locale, Record<string, unknown>>();
for (const [file, dict] of Object.entries(dictionaryModules)) {
  const code = file.replace(/^.*\/([^/]+)\.json$/, '$1');
  if ((LOCALE_CODES as readonly string[]).includes(code)) dictionaries.set(code as Locale, dict);
}

/** Live locales in table order (en first). Every static page is built for each. */
export const LOCALES: readonly Locale[] = ALL_LOCALES.filter((l) => dictionaries.has(l));

export const RTL_LOCALES = new Set<Locale>(RTL_CODES as Locale[]);

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
 * x-default the pages declared. One field, read by both, is the whole fix. Today
 * both fields read the one table in ./hreflang.mjs.
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
 * The only subtags in the table are SCRIPT subtags (zh-Hans, zh-Hant), and `nb`
 * for Norwegian Bokmal; ./hreflang.mjs explains both.
 *
 * `label` is the language's name in its own script (the switcher shows it),
 * `english` is its English name (the switcher also matches it when filtering).
 * Both come from ./names.mjs, which the client switcher imports directly.
 * Only the five launch locales keep a flag, and nothing new should read it: a
 * flag names a country, not a language.
 */
type LocaleMeta = {
  label: string;
  english: string;
  flag?: string;
  ogLocale: string;
  htmlLang: string;
  hreflang: string;
};
const NAMES = LANGUAGE_NAMES as Record<string, [string, string]>;
const m = (code: Locale, ogLocale: string, flag?: string): LocaleMeta => ({
  label: NAMES[code][0],
  english: NAMES[code][1],
  ...(flag ? { flag } : {}),
  ogLocale,
  htmlLang: (HL as Record<string, string>)[code],
  hreflang: (HL as Record<string, string>)[code],
});
export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: m('en', 'en_US', '🇬🇧'),
  ar: m('ar', 'ar_OM', '🇴🇲'),
  hi: m('hi', 'hi_IN', '🇮🇳'),
  bn: m('bn', 'bn_BD', '🇧🇩'),
  ur: m('ur', 'ur_PK', '🇵🇰'),
  es: m('es', 'es_ES'),
  fr: m('fr', 'fr_FR'),
  de: m('de', 'de_DE'),
  pt: m('pt', 'pt_BR'),
  it: m('it', 'it_IT'),
  nl: m('nl', 'nl_NL'),
  ru: m('ru', 'ru_RU'),
  uk: m('uk', 'uk_UA'),
  pl: m('pl', 'pl_PL'),
  cs: m('cs', 'cs_CZ'),
  sk: m('sk', 'sk_SK'),
  bg: m('bg', 'bg_BG'),
  tr: m('tr', 'tr_TR'),
  fa: m('fa', 'fa_IR'),
  he: m('he', 'he_IL'),
  el: m('el', 'el_GR'),
  ro: m('ro', 'ro_RO'),
  hu: m('hu', 'hu_HU'),
  zh: m('zh', 'zh_CN'),
  'zh-hant': m('zh-hant', 'zh_TW'),
  ja: m('ja', 'ja_JP'),
  ko: m('ko', 'ko_KR'),
  vi: m('vi', 'vi_VN'),
  th: m('th', 'th_TH'),
  id: m('id', 'id_ID'),
  ms: m('ms', 'ms_MY'),
  tl: m('tl', 'tl_PH'),
  sw: m('sw', 'sw_KE'),
  sv: m('sv', 'sv_SE'),
  no: m('no', 'nb_NO'),
  da: m('da', 'da_DK'),
  fi: m('fi', 'fi_FI'),
  et: m('et', 'et_EE'),
  lv: m('lv', 'lv_LV'),
  lt: m('lt', 'lt_LT'),
  sl: m('sl', 'sl_SI'),
  hr: m('hr', 'hr_HR'),
  sr: m('sr', 'sr_RS'),
  ca: m('ca', 'ca_ES'),
  ta: m('ta', 'ta_IN'),
  te: m('te', 'te_IN'),
  kn: m('kn', 'kn_IN'),
  ml: m('ml', 'ml_IN'),
  mr: m('mr', 'mr_IN'),
  gu: m('gu', 'gu_IN'),
  pa: m('pa', 'pa_IN'),
  or: m('or', 'or_IN'),
};

export { HREFLANG } from './hreflang.mjs';

const KEY_PATTERN = /^[a-z0-9_.-]+$/i;

/** True for a LIVE locale (one with a dictionary). */
export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function isCoreLocale(locale: Locale): boolean {
  return (CORE_LOCALES as readonly string[]).includes(locale);
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

/* ------------------------------------------------------------------------ *
 * Per-page availability.
 *
 * A static page exists in every live locale. A content page exists in every
 * live CORE locale (English fallback, the launch contract) and in a live
 * non-core locale only when that locale's own translated source file exists.
 * Two commercial-intent pages are written in English and Arabic only.
 *
 * The page routes (src/lib/paths.ts, glossary/[slug].astro), the hreflang set
 * (getAlternates), the language switcher and every internal link (localizePath)
 * all read THIS, so a page, its alternates and the links to it cannot disagree.
 * ------------------------------------------------------------------------ */

/** Pages whose copy exists in a fixed, smaller locale set. */
export const PAGE_LOCALE_LIMITS: Record<string, readonly Locale[]> = {
  '/erp-software-oman': ['en', 'ar'],
  '/stationery-supplies-oman': ['en', 'ar'],
  /* src/pages/404.astro is English only and outside the [...locale] tree. */
  '/404': ['en'],
};

const CONTENT_BASES = new Set<string>([...Object.values(CONTENT_ROUTES), GLOSSARY_ROUTE]);
let contentFiles: Map<string, Set<string>> | null = null;
function files(): Map<string, Set<string>> {
  if (!contentFiles) contentFiles = contentFilesOnDisk();
  return contentFiles;
}

function normalizePath(path: string): string {
  const clean = '/' + path.replace(/^\/+/, '').replace(/\/+$/, '');
  return clean;
}

/**
 * Is a glossary slug published? Only when EVERY live core locale has it: a
 * half-translated core term was explicitly verified away and stays away.
 */
export function glossaryPublished(slug: string): boolean {
  const have = files().get(`${GLOSSARY_ROUTE}/${slug}`);
  if (!have) return false;
  return LOCALES.filter(isCoreLocale).every((l) => have.has(l));
}

/** The live locales in which a default-locale path is (or will be) built. */
export function pageLocales(path: string): Locale[] {
  const clean = normalizePath(path);
  const limit = PAGE_LOCALE_LIMITS[clean];
  if (limit) return LOCALES.filter((l) => limit.includes(l));

  const segs = clean.split('/').filter(Boolean);
  const base = segs.length === 2 ? `/${segs[0]}` : '';
  if (!base || !CONTENT_BASES.has(base)) return [...LOCALES];

  const have = files().get(clean);
  if (!have) return [...LOCALES]; // unknown slug: not ours to judge, keep links exact
  const coreOk =
    base === GLOSSARY_ROUTE
      ? glossaryPublished(segs[1])
      : [...have].some((l) => (CORE as readonly string[]).includes(l));
  return LOCALES.filter((l) => (isCoreLocale(l) ? coreOk : have.has(l) && (base !== GLOSSARY_ROUTE || coreOk)));
}

export function pageExists(path: string, locale: Locale): boolean {
  return pageLocales(path).includes(locale);
}

/**
 * Prefix a default-locale path with the locale segment (en stays at root).
 * Always trailing-slashed.
 *
 * If the page does not exist in `locale` (an untranslated content page in a
 * non-core locale, or an English-and-Arabic-only page), the link goes to the
 * English page instead of to a URL that was never built. For a page that does
 * exist this is exactly the prefixing it always was, so canonicals and
 * hreflang hrefs (which only ever name existing pages) are unaffected.
 */
export function localizePath(path: string, locale: Locale): string {
  const clean = normalizePath(path);
  const target = isLocale(locale) && pageExists(clean, locale) ? locale : DEFAULT_LOCALE;
  const base = clean === '/' ? '' : clean;
  const localized = target === DEFAULT_LOCALE ? base : `/${target}${base}`;
  if (localized === '') return '/';
  return localized.endsWith('/') ? localized : localized + '/';
}

/**
 * Build the hreflang alternates for a default-locale path: one per locale in
 * which THIS page exists, plus x-default. A page that exists in one locale only
 * gets no annotation at all (a set of one is not an alternate set), which is
 * also what the sitemap integration emits for it.
 */
export function getAlternates(
  path: string,
  locales: readonly Locale[] = pageLocales(path)
): { hreflang: string; href: string }[] {
  const SITE = 'https://paperandpen.om';
  const selected = [...new Set(locales)].filter((l) => isLocale(l));
  if (selected.length < 2) return [];
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
    let value = lookup(dictionaries.get(active), keys);
    if (value === undefined) value = lookup(dictionaries.get(DEFAULT_LOCALE), keys);
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
  const value = lookup(dictionaries.get(active), keys);
  return value !== undefined ? value : lookup(dictionaries.get(DEFAULT_LOCALE), keys);
}
