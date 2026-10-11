import {
  LOCALES,
  DEFAULT_LOCALE,
  PAGE_LOCALE_LIMITS,
  isLocale,
  isCoreLocale,
  type Locale,
} from '@/i18n';

/**
 * getStaticPaths helper for the `[...locale]` rest-param routing pattern.
 * Default locale (en) → empty segment (root), others → their code.
 * Every LIVE locale (one with src/i18n/ui/<code>.json) gets every static page.
 */
export function localeStaticPaths() {
  return LOCALES.map((loc) => ({
    params: { locale: loc === DEFAULT_LOCALE ? undefined : loc },
    props: { locale: loc },
  }));
}

/** Pages whose factual copy has been written and reviewed in English and Arabic. */
export function englishArabicStaticPaths() {
  const allowed = PAGE_LOCALE_LIMITS['/erp-software-oman'];
  return LOCALES.filter((loc) => allowed.includes(loc)).map((loc) => ({
    params: { locale: loc === DEFAULT_LOCALE ? undefined : loc },
    props: { locale: loc },
  }));
}

/** Resolve the active locale from a `[...locale]` rest param value. */
export function resolveLocale(param: string | undefined): Locale {
  const first = (param || '').split('/').filter(Boolean)[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

type Entry<T> = { id?: string; data: T };

/** Throw when a source file's folder/name and its `locale`/`slug` fields disagree. */
function assertEntryPath(e: Entry<{ locale: string; slug: string }>) {
  if (!e.id) return;
  const want = `${e.data.locale}/${e.data.slug}`;
  if (e.id !== want) {
    throw new Error(
      `content entry ${e.id} declares locale/slug ${want}; the folder and file name must match ` +
        `(page availability is read from the file tree)`
    );
  }
}

/**
 * Build getStaticPaths for a content collection.
 *
 * Core locales (en, ar, hi, bn, ur) keep the launch contract: each slug is
 * emitted in every live core locale, using the English entry when a
 * translation is missing, so the page, its URL and its hreflang alternate all
 * exist.
 *
 * Every other locale gets the page ONLY when its own translated entry exists.
 * An English fallback page under /de/ would be a thin duplicate of the English
 * URL, so there is none; links to it resolve to the English page instead (see
 * localizePath) and the hreflang set leaves the locale out (see getAlternates).
 *
 * Each path also carries `alternateLocales`, the exact locale set this page is
 * built in, for templates that want to pass it on explicitly.
 */
export function contentStaticPaths<T extends { locale: Locale; slug: string }>(entries: Entry<T>[]) {
  const bySlug = new Map<string, Map<Locale, T>>();
  for (const e of entries) {
    assertEntryPath(e);
    const m = bySlug.get(e.data.slug) ?? new Map<Locale, T>();
    m.set(e.data.locale, e.data);
    bySlug.set(e.data.slug, m);
  }

  const paths: {
    params: { locale: string | undefined; slug: string };
    props: { data: T; locale: Locale; alternateLocales: Locale[] };
  }[] = [];
  for (const [slug, byLocale] of bySlug) {
    const coreEntry =
      byLocale.get(DEFAULT_LOCALE) ?? [...byLocale.entries()].find(([l]) => isCoreLocale(l))?.[1];
    const emitted: Locale[] = [];
    const rows: { locale: Locale; data: T }[] = [];
    for (const locale of LOCALES) {
      const own = byLocale.get(locale);
      const data = isCoreLocale(locale) ? own ?? coreEntry : own;
      if (!data) continue;
      emitted.push(locale);
      rows.push({ locale, data });
    }
    for (const { locale, data } of rows) {
      paths.push({
        params: { locale: locale === DEFAULT_LOCALE ? undefined : locale, slug },
        props: { data, locale, alternateLocales: emitted },
      });
    }
  }
  return paths;
}

/**
 * The entries a collection hub lists for a locale.
 *
 * Core locales: unchanged, the locale's own entries (all of them exist), or
 * English when a collection has none. Other locales: ONLY the locale's own
 * translated entries, in English order. Listing the untranslated English
 * entries would make the hub an English page under a /de/ URL, which is the
 * duplicate this rollout exists to avoid (scripts/verify.py fails an indexable
 * localised page that renders English). The hub grows as translations land.
 */
export function hubEntries<E extends { data: { locale: string; slug: string } }>(all: E[], locale: Locale): E[] {
  const mine = all.filter((e) => e.data.locale === locale);
  if (isCoreLocale(locale)) return mine.length ? mine : all.filter((e) => e.data.locale === DEFAULT_LOCALE);
  return mine;
}
