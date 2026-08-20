import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { HREFLANG, XDEFAULT_LOCALE } from './src/i18n/hreflang.mjs';

const SITE = 'https://paperandpen.om';
const LOCALES = ['en', 'ar', 'hi', 'bn', 'ur'];

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    mdx(),
    sitemap({
      // login/signup are noindex; listing them in the sitemap trips GSC's
      // "Excluded by noindex tag" report. Keep noindexed pages out entirely.
      /* A noindexed URL in the sitemap trips GSC's "Excluded by noindex tag"
         report, so anything the pages mark noindex has to be excluded here
         too. login/signup are bare noindex pages; /terms/ and /privacy/ are
         noindex in the four non-English locales because their text is English
         only and machine-translating binding legal terms is not something this
         site will do. */
      filter: (page) =>
        !/\/(login|signup)\/$/.test(page) &&
        !/\/(ar|hi|bn|ur)\/(terms|privacy)\/$/.test(page),
      /*
       * The codes come from src/i18n/hreflang.mjs, the SAME table getAlternates()
       * reads. This map used to hold its own literals (ar-OM / hi-IN / bn-BD /
       * ur-PK) while the pages annotated ar / hi / bn / ur, so each of 315 URL
       * pairs shipped two contradictory alternate sets. Never re-inline them.
       */
      i18n: {
        defaultLocale: XDEFAULT_LOCALE,
        locales: HREFLANG,
      },
      /*
       * @astrojs/sitemap's i18n option emits one xhtml:link per locale and no
       * x-default, but every page in this site declares an x-default in its
       * <head>. A sitemap that omits it contradicts the document. serialize()
       * is the only hook the integration exposes after the link set is built,
       * so the x-default is appended here, pointing at the English URL exactly
       * as getAlternates() does.
       */
      serialize(item) {
        if (!item.links || !item.links.length) return item;
        if (item.links.some((l) => l.lang === 'x-default')) return item;
        const en = item.links.find((l) => l.lang === HREFLANG[XDEFAULT_LOCALE]);
        if (en) item.links.push({ lang: 'x-default', url: en.url });
        return item;
      },
    }),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: LOCALES,
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  build: { inlineStylesheets: 'auto' },
  vite: {
    ssr: { noExternal: ['@astrojs/*'] },
  },
});
