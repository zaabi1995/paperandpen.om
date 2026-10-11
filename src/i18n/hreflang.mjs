/*
 * THE locale table. Plain .mjs with zero imports, deliberately.
 *
 * Three consumers with nothing else in common have to agree on these strings:
 * the page <head> (src/i18n/index.ts -> getAlternates -> Seo.astro), the
 * document language (<html lang>, also from index.ts) and the sitemap
 * (astro.config.mjs, which is loaded by vite before any content collection or
 * JSON dictionary exists). Before r375 they did not agree: the config declared
 * ar-OM / hi-IN / bn-BD / ur-PK and the pages declared ar / hi / bn / ur, so
 * all 315 URL pairs carried two contradictory alternate sets and the sitemap
 * omitted the x-default the pages already declared.
 *
 * Keeping this file dependency-free is what lets astro.config.mjs import it
 * without pulling in the UI dictionaries. Do not add imports to it.
 *
 * Why bare language codes and no region subtags: see the long note on
 * LOCALE_META in ./index.ts. Short version, a region subtag NARROWS targeting,
 * and every one of the four regions previously declared was the wrong region
 * for who actually reads that language on this site.
 *
 * Three codes are not bare ISO 639-1 and that is on purpose:
 *  - `zh` is Simplified Chinese and `zh-hant` is Traditional Chinese. They are
 *    two scripts, not two regions, so the SCRIPT subtag is the honest
 *    annotation: zh-Hans and zh-Hant. A region (zh-CN / zh-TW) would again be a
 *    narrowing, and Traditional is read in HK and MO as well as TW.
 *  - `no` is the URL segment for Norwegian, but the written standard the
 *    translation uses is Bokmal, whose code is `nb`. `no` is a macrolanguage
 *    tag; `nb` says exactly what the text is.
 *
 * The URL segment is always the key (e.g. /zh-hant/, /no/). The value is the
 * code written into <html lang>, every hreflang in the page <head> and every
 * xhtml:link in the sitemap. One value, three places, so they agree by
 * construction.
 */
export const HREFLANG = {
  en: 'en',
  ar: 'ar',
  hi: 'hi',
  bn: 'bn',
  ur: 'ur',
  es: 'es',
  fr: 'fr',
  de: 'de',
  pt: 'pt',
  it: 'it',
  nl: 'nl',
  ru: 'ru',
  uk: 'uk',
  pl: 'pl',
  cs: 'cs',
  sk: 'sk',
  bg: 'bg',
  tr: 'tr',
  fa: 'fa',
  he: 'he',
  el: 'el',
  ro: 'ro',
  hu: 'hu',
  zh: 'zh-Hans',
  'zh-hant': 'zh-Hant',
  ja: 'ja',
  ko: 'ko',
  vi: 'vi',
  th: 'th',
  id: 'id',
  ms: 'ms',
  tl: 'tl',
  sw: 'sw',
  sv: 'sv',
  no: 'nb',
  da: 'da',
  fi: 'fi',
  et: 'et',
  lv: 'lv',
  lt: 'lt',
  sl: 'sl',
  hr: 'hr',
  sr: 'sr',
  ca: 'ca',
  ta: 'ta',
  te: 'te',
  kn: 'kn',
  ml: 'ml',
  mr: 'mr',
  gu: 'gu',
  pa: 'pa',
  or: 'or',
};

/**
 * Every locale the site knows how to serve, in table order. A locale in this
 * list is only LIVE (gets pages) once src/i18n/ui/<code>.json exists; see
 * liveLocales() in ./live.mjs and LOCALES in ./index.ts.
 */
export const LOCALE_CODES = Object.keys(HREFLANG);

/**
 * The five locales the site launched with. Their content pages keep the
 * original contract: every content slug is emitted in all five, using the
 * English entry where a translation file is missing. Every locale added after
 * them gets a content page ONLY when its own translated entry exists, because
 * an English page under /de/ is a duplicate of /, not a German page.
 */
export const CORE_LOCALES = ['en', 'ar', 'hi', 'bn', 'ur'];

/** The locale whose URL x-default points at. */
export const XDEFAULT_LOCALE = 'en';
