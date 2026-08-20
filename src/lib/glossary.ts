import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/i18n';

export interface GlossaryTerm {
  slug: string;
  term: string;
  abbr?: string;
  category: 'invoicing' | 'accounting' | 'tax' | 'inventory' | 'metrics';
  short: string;
  metaTitle: string;
  metaDescription: string;
  definition: string;
  how: { title: string; body: string; items: string[] };
  formula?: { label: string; expr: string; note?: string };
  example?: { title: string; body: string };
  matters: string;
  faqs: { q: string; a: string }[];
  related: string[];
  seeAlso: { href: string; label: string }[];
}

/*
 * The glossary is a plain JSON tree rather than an Astro content collection on
 * purpose. A collection would need one schema-validated entry per term PER
 * LOCALE registered through the loader, and the glossary is the one part of the
 * site where the locale count multiplies hardest (77 terms x 5). Reading the
 * tree with import.meta.glob keeps the same guarantee that matters, which is
 * that a term only renders in a locale where a real translated file exists.
 */
const files = import.meta.glob<{ default: GlossaryTerm }>('../data/glossary/*/*.json', { eager: true });

const byLocale = new Map<Locale, Map<string, GlossaryTerm>>();
for (const loc of LOCALES) byLocale.set(loc, new Map());

for (const [path, mod] of Object.entries(files)) {
  const m = /\/glossary\/([a-z]{2})\/([^/]+)\.json$/.exec(path);
  if (!m) continue;
  const [, loc, slug] = m;
  if (!(LOCALES as readonly string[]).includes(loc)) continue;
  const data = { ...(mod as any).default, slug };
  byLocale.get(loc as Locale)!.set(slug, data as GlossaryTerm);
}

/** Slugs that exist in EVERY locale. A term missing a translation is not
 *  published at all, in any locale: half-translated is the failure mode this
 *  site was explicitly verified clean of, and one thin page is not worth
 *  spending that. */
export function publishedSlugs(): string[] {
  const en = byLocale.get(DEFAULT_LOCALE)!;
  return [...en.keys()]
    .filter((slug) => LOCALES.every((loc) => byLocale.get(loc)!.has(slug)))
    .sort();
}

export function getTerm(locale: Locale, slug: string): GlossaryTerm | undefined {
  return byLocale.get(locale)!.get(slug);
}

export function allTerms(locale: Locale): GlossaryTerm[] {
  const slugs = publishedSlugs();
  return slugs.map((s) => byLocale.get(locale)!.get(s)!).filter(Boolean);
}

export const CATEGORIES = ['invoicing', 'accounting', 'tax', 'inventory', 'metrics'] as const;
