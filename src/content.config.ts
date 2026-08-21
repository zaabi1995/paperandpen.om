import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Reusable sub-schemas
const faq = z.object({ q: z.string(), a: z.string() });
const articleStep = z.object({ name: z.string(), text: z.string() });
const articleSource = z.object({
  name: z.string(),
  publisher: z.string(),
  year: z.string(),
  url: z.string().url(),
});
const articleComparison = z.object({
  title: z.string(),
  columns: z.array(z.string()).min(2),
  rows: z.array(z.object({ label: z.string(), values: z.array(z.string()).min(2) })).min(1),
});
const feature = z.object({
  icon: z.string().default('check'),
  title: z.string(),
  desc: z.string(),
});
const section = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  body: z.string().optional(),
  items: z.array(z.string()).optional(),
  image: z.string().optional(),
});

// Shared marketing-page schema (features / documents / industries / use-cases)
const pageSchema = z.object({
  locale: z.enum(['en', 'ar', 'hi', 'bn', 'ur']),
  slug: z.string(),
  title: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  keywords: z.string().optional(),
  heroEyebrow: z.string().optional(),
  heroTitle: z.string(),
  heroSubtitle: z.string(),
  heroBullets: z.array(z.string()).optional(),
  features: z.array(feature).optional(),
  sections: z.array(section).optional(),
  faqs: z.array(faq).optional(),
  related: z.array(z.string()).optional(),
  ctaTitle: z.string().optional(),
  ctaSub: z.string().optional(),
  order: z.number().optional(),
});

// Preserve the locale folder in the id (en/inventory vs ar/inventory) so same-slug
// entries across locales don't collide into one id.
const keepPathId = ({ entry }: { entry: string }) => entry.replace(/\.(json|mdx?|md)$/, '');
const dataLoader = (dir: string) =>
  glob({ pattern: '**/*.json', base: `./src/content/${dir}`, generateId: keepPathId });

const features = defineCollection({ loader: dataLoader('features'), schema: pageSchema });
const documents = defineCollection({ loader: dataLoader('documents'), schema: pageSchema });
const industries = defineCollection({ loader: dataLoader('industries'), schema: pageSchema });
const usecases = defineCollection({ loader: dataLoader('usecases'), schema: pageSchema });

/*
 * r375. Two new page families, both on the shared pageSchema so they render
 * through the existing MarketingPage template with no new block:
 *  - `templates`  per-profession invoice-template pages (Wave runs 97 of these)
 *  - `alternatives`  "X alternative" switching pages, which are a DIFFERENT
 *    intent from the /compare/ matrices already on the site: a compare page is
 *    for someone choosing, an alternative page is for someone already leaving.
 */
const templates = defineCollection({ loader: dataLoader('templates'), schema: pageSchema });
const alternatives = defineCollection({ loader: dataLoader('alternatives'), schema: pageSchema });

/*
 * Country VAT pages. These carry CITED tax facts, so the schema makes the
 * citation structural rather than optional: every fact and every field list
 * points at a numbered entry in `sources`, and the page renders those sources
 * as real links. A country page may not ship without them.
 *
 * Only four countries exist here and that is deliberate. Qatar and Kuwait have
 * no VAT regime published by their own authorities, and the interesting part
 * (their e-invoicing plans) could not be verified against a reachable primary
 * source, so no page was written for them rather than a page written on
 * commentary. See the round report.
 */
const vat = defineCollection({
  loader: dataLoader('vat'),
  schema: pageSchema.extend({
    country: z.string(),
    authority: z.object({ name: z.string(), url: z.string().url() }),
    facts: z.array(z.object({
      label: z.string(), value: z.string(), note: z.string().optional(), source: z.number(),
    })),
    invoiceFields: z.object({
      intro: z.string(), items: z.array(z.string()), source: z.number(), caveat: z.string().optional(),
    }),
    einvoicing: z.object({ status: z.string(), body: z.string(), source: z.number() }),
    sources: z.array(z.object({
      n: z.number(), label: z.string(), publisher: z.string(), year: z.string(), url: z.string().url(),
    })).min(1),
  }),
});

// Comparison pages add a feature matrix
const comparisons = defineCollection({
  loader: dataLoader('comparisons'),
  schema: pageSchema.extend({
    competitor: z.string(),
    matrixCols: z.array(z.string()),
    matrix: z.array(
      z.object({ feature: z.string(), values: z.array(z.union([z.boolean(), z.string()])) })
    ),
  }),
});

// Free-tool generator pages
const tools = defineCollection({
  loader: dataLoader('tools'),
  schema: pageSchema.extend({
    toolType: z.enum([
      'invoice',
      'quotation',
      'estimate',
      'proforma',
      'credit-note',
      'receipt',
      'purchase-order',
      'delivery-note',
      'vat-calculator',
    ]),
    howToSteps: z.array(z.object({ name: z.string(), text: z.string() })).optional(),
  }),
});

// Blog (MDX content)
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog', generateId: keepPathId }),
  schema: z.object({
    locale: z.enum(['en', 'ar', 'hi', 'bn', 'ur']),
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    shortAnswer: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Paper & Pen'),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    keyTakeaways: z.array(z.string()).min(3).max(7).optional(),
    comparison: articleComparison.optional(),
    howTo: z.object({ name: z.string(), steps: z.array(articleStep).min(3).max(10) }).optional(),
    faqs: z.array(faq).min(3).max(10).optional(),
    sources: z.array(articleSource).min(1).optional(),
  }),
});

export const collections = { features, documents, industries, usecases, comparisons, tools, blog, templates, alternatives, vat };
