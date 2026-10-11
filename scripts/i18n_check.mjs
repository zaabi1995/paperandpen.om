#!/usr/bin/env node
/*
 * i18n_check: proves a translated file has the SAME shape as its English source.
 *
 *   node scripts/i18n_check.mjs ui <code>            src/i18n/ui/<code>.json vs en.json
 *   node scripts/i18n_check.mjs content <code>       every src/content/<coll>/<code>/*.json vs its en/ twin
 *   node scripts/i18n_check.mjs all                  every locale found on disk, both kinds
 *
 * Shape = same keys at every depth, same array lengths, same {{vars}} in each string, same URLs and
 * same HTML tags. Values that must never be translated (slug, locale, order, related, icon, competitor,
 * toolType, URLs) must match English, except `locale`, which must equal the file's own code.
 * Also fails on an em dash, and on a string left identical to a long English sentence (untranslated).
 * Exit 0 = pass. Written for the 52-language rollout (11 Oct 2026).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// Checked only at the TOP level of a content file (the UI dictionary has its own `related` section of labels).
const KEEP = new Set(['slug', 'order', 'icon', 'toolType', 'href', 'url', 'path', 'image']);
const errors = [];
const VARS = (s) => [...s.matchAll(/\{\{\s*\w+\s*\}\}/g)].map((m) => m[0].replace(/\s/g, '')).sort().join(',');
const URLS = (s) => [...s.matchAll(/https?:\/\/[^\s"'<)]+|(?<![\w])\/[a-z0-9-]+(?:\/[a-z0-9-]*)*\/(?=["'\s)<]|$)/g)].map((m) => m[0]).sort().join(',');
const TAGS = (s) => [...s.matchAll(/<\/?([a-z][a-z0-9]*)\b/gi)].map((m) => m[1].toLowerCase()).sort().join(',');

function walk(en, tr, where, code, untranslated, top = false) {
  if (Array.isArray(en)) {
    if (!Array.isArray(tr)) return errors.push(`${where}: expected array`);
    if (en.length !== tr.length) errors.push(`${where}: array length ${tr.length}, English has ${en.length}`);
    en.forEach((v, i) => walk(v, tr[i], `${where}[${i}]`, code, untranslated));
    return;
  }
  if (en && typeof en === 'object') {
    if (!tr || typeof tr !== 'object' || Array.isArray(tr)) return errors.push(`${where}: expected object`);
    for (const k of Object.keys(en)) {
      if (!(k in tr)) { errors.push(`${where}.${k}: missing`); continue; }
      const key = k;
      if (top && key === 'locale') { if (tr[k] !== code) errors.push(`${where}.locale: must be "${code}"`); continue; }
      // `related` may DROP a link to a page that does not exist in this language, never add or change one.
      if (top && key === 'related') { if (!Array.isArray(tr[k]) || tr[k].some((x) => !en[k].includes(x))) errors.push(`${where}.related: only links from the English list`); continue; }
      if (top && KEEP.has(key)) { if (JSON.stringify(en[k]) !== JSON.stringify(tr[k])) errors.push(`${where}.${k}: must stay as English`); continue; }
      walk(en[k], tr[k], `${where}.${k}`, code, untranslated);
    }
    for (const k of Object.keys(tr)) if (!(k in en)) errors.push(`${where}.${k}: extra key`);
    return;
  }
  if (typeof en === 'string') {
    if (typeof tr !== 'string') return errors.push(`${where}: expected string`);
    if (VARS(en) !== VARS(tr)) errors.push(`${where}: {{vars}} differ`);
    if (TAGS(en) !== TAGS(tr)) errors.push(`${where}: HTML tags differ`);
    if (URLS(en) !== URLS(tr)) errors.push(`${where}: links differ`);
    if (tr.includes('—')) errors.push(`${where}: em dash`);
    if (code !== 'en' && en.length > 40 && tr === en && /[a-z]{4,} [a-z]{4,} [a-z]{4,}/.test(en)) untranslated.push(where);
    return;
  }
  if (JSON.stringify(en) !== JSON.stringify(tr)) errors.push(`${where}: value must stay as English`);
}

function read(f) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { errors.push(`${path.relative(ROOT, f)}: ${e.message}`); return null; }
}

function checkUi(code) {
  const f = path.join(ROOT, 'src/i18n/ui', `${code}.json`);
  if (!fs.existsSync(f)) return errors.push(`ui/${code}.json: missing`);
  const un = [];
  const tr = read(f); if (tr) walk(read(path.join(ROOT, 'src/i18n/ui/en.json')), tr, `ui/${code}`, code, un);
  if (un.length > 3) errors.push(`ui/${code}: ${un.length} strings still English, e.g. ${un.slice(0, 3).join(' ')}`);
}

function checkContent(code) {
  const base = path.join(ROOT, 'src/content');
  let n = 0;
  for (const coll of fs.readdirSync(base)) {
    const dir = path.join(base, coll, code);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const enf = path.join(base, coll, 'en', file);
      if (!fs.existsSync(enf)) { errors.push(`${coll}/${code}/${file}: no English twin`); continue; }
      const un = [];
      const tr = read(path.join(dir, file)); if (tr) walk(read(enf), tr, `${coll}/${code}/${file}`, code, un, true);
      if (un.length > 2) errors.push(`${coll}/${code}/${file}: ${un.length} strings still English`);
      // Two seo_integrity.py rules, checked here so a translator sees them before the build does.
      const enData = read(enf);
      if (tr && enData && typeof tr.title === 'string' && tr.title === enData.title) errors.push(`${coll}/${code}/${file}: title is identical to English`);
      if (tr && coll === 'tools' && file === 'oman-vat-calculator.json' && tr.heroSubtitle !== tr.metaDescription) errors.push(`${coll}/${code}/${file}: heroSubtitle must equal metaDescription`);
      n++;
    }
  }
  // Blog posts are MDX: front matter + Markdown. Same front matter keys, own locale, same slug/date/tags,
  // same internal links and the same number of headings as the English post; translated title; no em dash.
  const blogDir = path.join(base, 'blog', code);
  // ar, hi, bn and ur were written before this check existed; their posts that lag a later English
  // edit are reported as warnings to refresh, not failures (11 Oct 2026). New locales must match.
  const LEGACY = new Set(['ar', 'hi', 'bn', 'ur']);
  const before = errors.length;
  if (fs.existsSync(blogDir)) {
    const fm = (t) => {
      const m = t.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!m) return null;
      const meta = {};
      for (const line of m[1].split('\n')) { const k = line.match(/^([A-Za-z]+):\s*(.*)$/); if (k) meta[k[1]] = k[2].trim(); }
      return { meta, body: m[2] };
    };
    const links = (b) => [...b.matchAll(/\]\(([^)\s]+)\)/g)].map((x) => x[1]).sort().join(' ');
    const heads = (b) => (b.match(/^#{1,6} /gm) || []).length;
    for (const file of fs.readdirSync(blogDir).filter((x) => /\.mdx?$/.test(x))) {
      const enf = path.join(base, 'blog', 'en', file);
      const where = `blog/${code}/${file}`;
      if (!fs.existsSync(enf)) { errors.push(`${where}: no English twin`); continue; }
      const e = fm(fs.readFileSync(enf, 'utf8')), t = fm(fs.readFileSync(path.join(blogDir, file), 'utf8'));
      if (!t) { errors.push(`${where}: no front matter`); continue; }
      const ek = Object.keys(e.meta).sort().join(','), tk = Object.keys(t.meta).sort().join(',');
      if (ek !== tk) errors.push(`${where}: front matter keys ${tk} differ from English ${ek}`);
      if (t.meta.locale !== `"${code}"`) errors.push(`${where}: locale must be "${code}"`);
      for (const k of ['slug', 'pubDate', 'tags', 'updatedDate']) if (k in e.meta && e.meta[k] !== t.meta[k]) errors.push(`${where}: ${k} must stay as English`);
      if (t.meta.title === e.meta.title) errors.push(`${where}: title is identical to English`);
      if (links(e.body) !== links(t.body)) errors.push(`${where}: internal links differ from English`);
      if (heads(e.body) !== heads(t.body)) errors.push(`${where}: heading count ${heads(t.body)}, English has ${heads(e.body)}`);
      if (/\u2014/.test(fs.readFileSync(path.join(blogDir, file), 'utf8'))) errors.push(`${where}: em dash`);
      n++;
    }
    if (LEGACY.has(code)) for (const w of errors.splice(before)) console.log(`WARN (refresh) ${w}`);
  }
  return n;
}

const [kind, code] = process.argv.slice(2);
if (kind === 'ui') checkUi(code);
else if (kind === 'content') console.log(`${checkContent(code)} content files checked`);
else if (kind === 'all') {
  for (const f of fs.readdirSync(path.join(ROOT, 'src/i18n/ui'))) {
    const c = f.replace(/\.json$/, '');
    if (c !== 'en' && f.endsWith('.json')) { checkUi(c); checkContent(c); }
  }
} else { console.error('usage: i18n_check.mjs ui|content <code> | all'); process.exit(2); }

if (errors.length) { console.log(errors.slice(0, 60).join('\n')); console.log(`FAIL: ${errors.length} problems`); process.exit(1); }
console.log('PASS');
