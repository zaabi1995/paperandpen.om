import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

const SITE = 'https://paperandpen.om';
const LOCALES = ['en', 'ar', 'hi', 'bn', 'ur'];

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    mdx(),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', ar: 'ar-OM', hi: 'hi-IN', bn: 'bn-BD', ur: 'ur-PK' },
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
