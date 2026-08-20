/*
 * THE hreflang table. Plain .mjs with zero imports, deliberately.
 *
 * Two consumers with nothing else in common have to agree on these strings:
 * the page <head> (src/i18n/index.ts -> getAlternates -> Seo.astro) and the
 * sitemap (astro.config.mjs, which is loaded by vite before any content
 * collection or JSON dictionary exists). Before r375 they did not agree: the
 * config declared ar-OM / hi-IN / bn-BD / ur-PK and the pages declared
 * ar / hi / bn / ur, so all 315 URL pairs carried two contradictory alternate
 * sets and the sitemap omitted the x-default the pages already declared.
 *
 * Keeping this file dependency-free is what lets astro.config.mjs import it
 * without pulling in the five UI dictionaries. Do not add imports to it.
 *
 * Why bare language codes and no region subtags: see the long note on
 * LOCALE_META in ./index.ts. Short version, a region subtag NARROWS targeting,
 * and every one of the four regions previously declared was the wrong region
 * for who actually reads that language on this site.
 */
export const HREFLANG = {
  en: 'en',
  ar: 'ar',
  hi: 'hi',
  bn: 'bn',
  ur: 'ur',
};

/** The locale whose URL x-default points at. */
export const XDEFAULT_LOCALE = 'en';
