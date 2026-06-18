import { LOCALES, DEFAULT_LOCALE, isLocale, type Locale } from '@/i18n';

/**
 * getStaticPaths helper for the `[...locale]` rest-param routing pattern.
 * Default locale (en) → empty segment (root), others → their code.
 */
export function localeStaticPaths() {
  return LOCALES.map((loc) => ({
    params: { locale: loc === DEFAULT_LOCALE ? undefined : loc },
    props: { locale: loc },
  }));
}

/** Resolve the active locale from a `[...locale]` rest param value. */
export function resolveLocale(param: string | undefined): Locale {
  const first = (param || '').split('/').filter(Boolean)[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

/**
 * Build getStaticPaths for a content collection across ALL locales.
 * Each slug is emitted once per locale (5 total). Localized data is used when a
 * translation exists, otherwise it falls back to the English entry so the page,
 * its URL and its hreflang alternate all exist (valid international SEO).
 */
export function contentStaticPaths<T extends { locale: Locale; slug: string }>(
  entries: { data: T }[]
) {
  const bySlug = new Map<string, Map<Locale, T>>();
  for (const e of entries) {
    const m = bySlug.get(e.data.slug) ?? new Map<Locale, T>();
    m.set(e.data.locale, e.data);
    bySlug.set(e.data.slug, m);
  }

  const paths: { params: { locale: string | undefined; slug: string }; props: { data: T; locale: Locale } }[] = [];
  for (const [slug, byLocale] of bySlug) {
    const en = byLocale.get(DEFAULT_LOCALE) ?? [...byLocale.values()][0];
    for (const locale of LOCALES) {
      const data = byLocale.get(locale) ?? en;
      paths.push({
        params: { locale: locale === DEFAULT_LOCALE ? undefined : locale, slug },
        props: { data, locale },
      });
    }
  }
  return paths;
}
