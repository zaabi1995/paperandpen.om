#!/usr/bin/env node
/**
 * Paper & Pen design + a11y regression gate.
 *
 * Every check here exists because the defect it catches actually happened during
 * the waveapps.com gauntlet and was invisible until something measured it.
 * Run against a built site being served (default http://localhost:4321).
 *
 *   node .gauntlet/verify.mjs [baseUrl]
 *
 * Exits non-zero if any check fails, so it can gate a deploy.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = (process.argv[2] || 'http://localhost:4321').replace(/\/$/, '');
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
};

const contrast = (a, b) => {
  const lum = ([r, g, b2]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b2);
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const rgb = (s) => (s.match(/\d+/g) || []).slice(0, 3).map(Number);

/* ------------------------------------------------------------------ preflight
 * A broken or missing build serves the 404 page, and every check below then
 * "fails" with confident, specific, completely wrong numbers — white 32px text,
 * no dir attribute, a fallback font. That is worse than no gate at all, because
 * it looks like a real regression report. So refuse to run instead. */
const distDir = path.join(REPO, 'dist');
const htmlCount = fs.existsSync(distDir)
  ? (function walk(d) {
      return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
    })(distDir).filter((f) => f.endsWith('.html')).length
  : 0;

if (htmlCount === 0) {
  console.error(
    'ABORT: dist/ contains no HTML, so the build is broken or has never run.\n' +
    '       Refusing to report design checks against a 404 page — the numbers\n' +
    '       would look like real regressions. Fix the build, then re-run.'
  );
  process.exit(2);
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

// ---------------------------------------------------------------- home page
const resp = await page.goto(BASE + '/', { waitUntil: 'networkidle' });
if (!resp || resp.status() >= 400 || /404:\s*Not Found/.test(await page.title() + (await page.content()).slice(0, 2000))) {
  console.error(
    `ABORT: ${BASE}/ returned ${resp ? resp.status() : 'no response'} or rendered the 404 page.\n` +
    '       Is the preview server running and serving a current build?'
  );
  await browser.close();
  process.exit(2);
}
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

const home = await page.evaluate(() => {
  const h1 = document.querySelector('h1');
  const cs = getComputedStyle(h1);
  const size = parseFloat(cs.fontSize);
  const lh = parseFloat(cs.lineHeight);
  // First substantive paragraph after the headline.
  const p = [...document.querySelectorAll('p')].find((el) => el.textContent.trim().length > 60);
  const gap = p ? Math.round(p.getBoundingClientRect().top - h1.getBoundingClientRect().bottom) : null;
  const measure = (fam) => {
    const c = document.createElement('canvas').getContext('2d');
    c.font = `700 100px ${fam}`;
    return c.measureText('Handgloves').width;
  };
  return {
    h1Count: document.querySelectorAll('h1').length,
    size, lh, ratio: +(lh / size).toFixed(3),
    h1Colour: cs.color,
    bodyColour: p ? getComputedStyle(p).color : null,
    ground: getComputedStyle(document.body).backgroundColor,
    gap,
    stackWidth: measure(cs.fontFamily),
    ss4Width: measure('"Source Serif 4"'),
    fallbackWidth: measure('"__definitely_not_a_font__"'),
    docWidth: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  };
});

record('home has exactly one <h1>', home.h1Count === 1, `found ${home.h1Count}`);

// Regression #1: leading collapsed to solid. Lost four rounds to this.
record(
  'h1 leading is open, not solid',
  home.ratio >= 1.1,
  `${home.size}px on ${home.lh}px = ratio ${home.ratio} (need >= 1.10)`
);

// Regression #2: headline sat half as far from the body as the bar.
record(
  'headline-to-body gap is generous',
  home.gap !== null && home.gap >= 40,
  `${home.gap}px (need >= 40)`
);

// Regression #3: the display face silently fell back to Playfair for three rounds
// because tailwind named a family BaseLayout never requested.
const usingSS4 = Math.abs(home.stackWidth - home.ss4Width) < 0.5;
const isFallback = Math.abs(home.stackWidth - home.fallbackWidth) < 0.5;
record(
  'display face really is Source Serif 4, not a fallback',
  usingSS4 && !isFallback,
  `authored stack ${home.stackWidth.toFixed(2)}, SS4 ${home.ss4Width.toFixed(2)}, generic fallback ${home.fallbackWidth.toFixed(2)}`
);

// Regression #4: body dropped to a weaker ink tier and the page read hazy.
record(
  'headline and body share one ink',
  home.h1Colour === home.bodyColour,
  `h1 ${home.h1Colour} vs body ${home.bodyColour}`
);

const ratioAA = contrast(rgb(home.bodyColour || 'rgb(0,0,0)'), rgb(home.ground));
record('body text meets WCAG AA on the page ground', ratioAA >= 4.5, `${ratioAA.toFixed(2)}:1 (need >= 4.5)`);

record('no horizontal overflow at 1440', home.docWidth <= home.viewport, `scrollWidth ${home.docWidth} vs viewport ${home.viewport}`);

/* Every status badge must actually PAINT. This exists because `bg-mint`
 * compiled to nothing — `mint` is a scale with no DEFAULT — so the hero's Paid
 * badge rendered as bare green text while a source comment claimed all three
 * were pills. It was invisible at page scale; only a computed-style read caught
 * it, and only after a critic was handed the claim as fact. A class that emits
 * no CSS fails silently, so assert the PAINT, never the class name. */
const badges = await page.evaluate(() =>
  [...document.querySelectorAll('.rounded-pill')]
    .filter((el) => /^(Paid|Overdue|Draft)$/i.test(el.textContent.trim()))
    .map((el) => ({ text: el.textContent.trim(), bg: getComputedStyle(el).backgroundColor }))
);
const unpainted = badges.filter((b) => b.bg === 'rgba(0, 0, 0, 0)' || b.bg === 'transparent');
record(
  'every status badge paints a real background',
  badges.length > 0 && unpainted.length === 0,
  badges.length
    ? `${badges.length} badge(s); unpainted: ${unpainted.length ? unpainted.map((b) => b.text + '=' + b.bg).join(', ') : 'none'}`
    : 'no status badges found on the page'
);

// ---------------------------------------------------------------- mobile
/* scrollWidth ALONE IS NOT ENOUGH, and trusting it shipped a broken phone layout.
 * `.band` carries overflow-x: clip so the hero's decorative product window can
 * bleed off the edge. Clip also suppresses the overflow from scrollWidth — so
 * when a grid item's min-content floored the column at 385px inside a 390px
 * viewport, the standfirst, the workspace field and the CTA were CLIPPED off the
 * right edge on a real iPhone while this gate reported "no horizontal overflow".
 * A check that cannot fail is not evidence.
 *
 * So we now walk the box tree and flag any element whose box escapes the
 * viewport, excluding two legitimate cases: anything inside an overflow-x
 * auto/scroll container (a table that is meant to scroll), and anything inside
 * aria-hidden (deliberate decorative bleed). */
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const probeMobile = async (path, width) => {
  const mctx = await browser.newContext({
    viewport: { width, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: MOBILE_UA, deviceScaleFactor: 2,
  });
  const mp = await mctx.newPage();
  await mp.goto(BASE + path, { waitUntil: 'networkidle' });
  await mp.waitForTimeout(400);
  const out = await mp.evaluate((vw) => {
    const clipped = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= vw + 0.5 && r.left >= -0.5) continue;
      let n = el.parentElement, scrollable = false;
      while (n && n !== document.body) {
        const ov = getComputedStyle(n).overflowX;
        if (ov === 'auto' || ov === 'scroll') { scrollable = true; break; }
        n = n.parentElement;
      }
      if (scrollable) continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      if (el.classList.contains('skip-link')) continue; // off-canvas until focused, verified separately
      clipped.push(`${el.tagName}.${(el.className || '').toString().slice(0, 30)}@${Math.round(r.right)}`);
    }
    const tiny = [];
    for (const el of document.querySelectorAll('a,button,[role="button"],input,select,summary')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (el.classList.contains('skip-link')) continue;
      if (r.height < 24 || r.width < 24) tiny.push(`${el.tagName}.${(el.className || '').toString().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return { sw: document.documentElement.scrollWidth, clipped, tiny };
  }, width);
  await mctx.close();
  return out;
};

const MOBILE_PAGES = ['/', '/pricing/', '/signup/', '/features/invoicing/', '/tools/', '/ar/', '/ar/pricing/'];
const clippedPages = [];
const tinyPages = [];
for (const path of MOBILE_PAGES) {
  for (const w of [390, 393]) {
    const m = await probeMobile(path, w);
    if (m.sw > w + 1 || m.clipped.length) clippedPages.push(`${path}@${w}: sw=${m.sw} ${m.clipped.slice(0, 2).join(', ')}`);
    if (m.tiny.length) tinyPages.push(`${path}: ${m.tiny.length} (e.g. ${m.tiny[0]})`);
  }
}
record(
  'no content clipped or overflowing on a phone (390 and 393)',
  clippedPages.length === 0,
  clippedPages.length ? clippedPages.slice(0, 3).join(' | ') : `${MOBILE_PAGES.length} pages x 2 widths clean`
);
record(
  'tap targets are at least 24x24 (WCAG 2.5.8)',
  tinyPages.length === 0,
  tinyPages.length ? tinyPages.slice(0, 3).join(' | ') : 'all interactive targets >= 24px'
);

// The skip link is allowed to be 1x1 at rest ONLY because it becomes a real
// target on focus. Prove that rather than exempting it blindly.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.keyboard.press('Tab');
await page.waitForTimeout(300);
const skip = await page.evaluate(() => {
  const e = document.querySelector('.skip-link');
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), focused: document.activeElement === e };
});
record(
  'skip link becomes a real target when focused',
  !!skip && skip.focused && skip.w >= 44 && skip.h >= 24,
  skip ? `${skip.w}x${skip.h}, focused=${skip.focused}` : 'no .skip-link found'
);

// ---------------------------------------------------------------- RTL
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE + '/ar/', { waitUntil: 'networkidle' });
const ar = await page.evaluate(() => ({
  dir: document.documentElement.getAttribute('dir'),
  lang: document.documentElement.getAttribute('lang'),
  overflow: document.documentElement.scrollWidth <= window.innerWidth,
  sw: document.documentElement.scrollWidth,
  vw: window.innerWidth,
}));
record('Arabic renders RTL', ar.dir === 'rtl' && ar.lang === 'ar', `dir=${ar.dir} lang=${ar.lang}`);
record('Arabic has no sideways scroll', ar.overflow, `scrollWidth ${ar.sw} vs viewport ${ar.vw}`);

await browser.close();

// ---------------------------------------------------------------- static checks
const dist = path.join(REPO, 'dist');
if (fs.existsSync(dist)) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const files = walk(dist);
  const html = files.filter((f) => f.endsWith('.html'));

  const google = html.filter((f) => /fonts\.(googleapis|gstatic)\.com/.test(fs.readFileSync(f, 'utf8')));
  record('no Google Fonts anywhere in the build', google.length === 0,
    google.length ? `${google.length} file(s), first: ${path.relative(dist, google[0])}` : `checked ${html.length} html files`);

  const playfair = html.filter((f) => /Playfair/.test(fs.readFileSync(f, 'utf8')));
  record('Playfair Display is fully gone', playfair.length === 0,
    playfair.length ? `${playfair.length} file(s) still reference it` : `checked ${html.length} html files`);

  const multiH1 = html.filter((f) => (fs.readFileSync(f, 'utf8').match(/<h1[\s>]/g) || []).length !== 1);
  record('every page has exactly one <h1>', multiH1.length === 0,
    multiH1.length ? `${multiH1.length} page(s), first: ${path.relative(dist, multiH1[0])}` : `checked ${html.length} pages`);
} else {
  record('dist checks', false, 'dist/ not found — run npm run build first');
}

// i18n key parity: a missing key silently falls back to English and looks fine.
const uiDir = path.join(REPO, 'src/i18n/ui');
if (fs.existsSync(uiDir)) {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flat(v, `${p}${k}.`) : [`${p}${k}`]);
  const en = new Set(flat(JSON.parse(fs.readFileSync(path.join(uiDir, 'en.json'), 'utf8'))));
  const missing = [];
  for (const loc of ['ar', 'hi', 'bn', 'ur']) {
    const keys = new Set(flat(JSON.parse(fs.readFileSync(path.join(uiDir, `${loc}.json`), 'utf8'))));
    const gone = [...en].filter((k) => !keys.has(k));
    if (gone.length) missing.push(`${loc} missing ${gone.length} (e.g. ${gone.slice(0, 3).join(', ')})`);
  }
  record('all 5 locales have key parity with English', missing.length === 0,
    missing.length ? missing.join(' | ') : `${en.size} keys present in ar, hi, bn, ur`);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED: ' + failed.map((f) => f.name).join('; '));
  process.exit(1);
}
