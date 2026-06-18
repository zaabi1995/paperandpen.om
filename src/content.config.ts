import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Reusable sub-schemas
const faq = z.object({ q: z.string(), a: z.string() });
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
      'proforma',
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
    pubDate: z.coerce.date(),
    author: z.string().default('Paper & Pen'),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { features, documents, industries, usecases, comparisons, tools, blog };
