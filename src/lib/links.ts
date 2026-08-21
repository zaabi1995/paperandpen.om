import { getCollection } from 'astro:content';
import { DEFAULT_LOCALE, type Locale } from '@/i18n';

/*
 * Localised labels for internal links.
 *
 * Before r375 every `related` link on a marketing page derived its label by
 * title-casing the URL slug: `/features/hr-payroll` printed "Hr Payroll", in
 * ENGLISH, on all five locales including the two RTL ones. The collections
 * already carry a translated `title` per locale, so the label is looked up
 * rather than reconstructed, and the slug-casing path survives only as the last
 * resort for a path no collection owns.
 */
const COLLECTION_BASE: Record<string, string> = {
  features: '/features',
  documents: '/invoicing',
  industries: '/industries',
  usecases: '/use-cases',
  comparisons: '/compare',
  tools: '/tools',
  templates: '/invoice-templates',
  alternatives: '/alternatives',
  blog: '/blog',
};

let cache: Map<Locale, Map<string, string>> | null = null;

export async function linkLabels(): Promise<Map<Locale, Map<string, string>>> {
  if (cache) return cache;
  cache = new Map();
  for (const [name, base] of Object.entries(COLLECTION_BASE)) {
    let entries;
    try {
      entries = await getCollection(name as any);
    } catch {
      continue;
    }
    for (const e of entries as any[]) {
      const loc = e.data.locale as Locale;
      if (!cache.has(loc)) cache.set(loc, new Map());
      cache.get(loc)!.set(`${base}/${e.data.slug}`, e.data.title);
    }
  }
  return cache;
}

/** Title-case a slug. The fallback of last resort, English-shaped by nature. */
function fromSlug(href: string): string {
  const seg = href.split('/').filter(Boolean).pop() || '';
  return seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function labelFor(href: string, locale: Locale, t: (k: string) => string): Promise<string> {
  const clean = '/' + href.replace(/^\/+/, '').replace(/\/+$/, '');
  const STATIC: Record<string, string> = {
    '/pricing': t('nav.pricing'),
    '/glossary': t('nav.glossary'),
    '/invoice-templates': t('nav.templates'),
    '/alternatives': t('nav.alternatives'),
    '/tools': t('mega.allTools'),
    '/blog': t('footer.blog'),
    '/faq': t('footer.faq'),
    '/about': t('footer.about'),
    '/contact': t('footer.contact'),
    '/security': t('footer.security'),
    '/free-invoicing-software': t('mega.allFeatures'),
  };
  if (STATIC[clean]) return STATIC[clean];
  const maps = await linkLabels();
  return maps.get(locale)?.get(clean) ?? maps.get(DEFAULT_LOCALE)?.get(clean) ?? fromSlug(clean);
}
