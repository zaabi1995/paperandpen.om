/*
 * What exists ON DISK, read with node:fs so that astro.config.mjs (which runs
 * before vite and before any collection exists), the page code and the build
 * scripts can all ask the same question and get the same answer.
 *
 * Two facts drive every locale decision on this site:
 *   1. a locale is LIVE when src/i18n/ui/<code>.json exists;
 *   2. a content page exists in a non-core locale only when that locale's own
 *      translated entry exists (src/content/<collection>/<code>/<slug>.*, or
 *      src/data/glossary/<code>/<slug>.json).
 * Nothing here hardcodes a locale list beyond the table in ./hreflang.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { LOCALE_CODES } from './hreflang.mjs';

/** Content collection -> the route base its [slug] pages render under. */
export const CONTENT_ROUTES = {
  features: '/features',
  documents: '/invoicing',
  industries: '/industries',
  usecases: '/use-cases',
  comparisons: '/compare',
  tools: '/tools',
  templates: '/invoice-templates',
  alternatives: '/alternatives',
  vat: '/vat',
  blog: '/blog',
};

/** The glossary is a JSON tree under src/data, not a collection. */
export const GLOSSARY_ROUTE = '/glossary';

function listDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Live locales in table order, read from src/i18n/ui/*.json. */
export function liveLocalesOnDisk(root = process.cwd()) {
  const names = new Set(
    listDir(path.join(root, 'src/i18n/ui'))
      .filter((d) => d.isFile() && d.name.endsWith('.json'))
      .map((d) => d.name.slice(0, -'.json'.length))
  );
  return LOCALE_CODES.filter((code) => names.has(code));
}

/**
 * Map of default-locale route path (e.g. "/features/invoicing") to the set of
 * locale folders that hold a source file for it. Locales are NOT filtered by
 * liveness here; callers intersect with the live set.
 */
export function contentFilesOnDisk(root = process.cwd()) {
  const out = new Map();
  const add = (route, locale) => {
    if (!LOCALE_CODES.includes(locale)) return;
    const set = out.get(route) ?? new Set();
    set.add(locale);
    out.set(route, set);
  };
  for (const [collection, base] of Object.entries(CONTENT_ROUTES)) {
    const dir = path.join(root, 'src/content', collection);
    for (const loc of listDir(dir)) {
      if (!loc.isDirectory()) continue;
      for (const f of listDir(path.join(dir, loc.name))) {
        const m = /^(.+)\.(json|mdx|md)$/.exec(f.name);
        if (f.isFile() && m) add(`${base}/${m[1]}`, loc.name);
      }
    }
  }
  const gdir = path.join(root, 'src/data/glossary');
  for (const loc of listDir(gdir)) {
    if (!loc.isDirectory()) continue;
    for (const f of listDir(path.join(gdir, loc.name))) {
      const m = /^(.+)\.json$/.exec(f.name);
      if (f.isFile() && m) add(`${GLOSSARY_ROUTE}/${m[1]}`, loc.name);
    }
  }
  return out;
}
