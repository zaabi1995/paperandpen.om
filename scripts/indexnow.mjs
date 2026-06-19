// Submit all site URLs to IndexNow (Bing, Yandex, Seznam) for instant indexing.
// Usage: node scripts/indexnow.mjs <key>
// Reads URLs from dist/sitemap-0.xml (run `npm run build` first).
import { readFileSync } from 'node:fs';

const HOST = 'paperandpen.om';
const key = process.argv[2];
if (!key) {
  console.error('Usage: node scripts/indexnow.mjs <key>');
  process.exit(1);
}

const xml = readFileSync(new URL('../dist/sitemap-0.xml', import.meta.url), 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urls.length) {
  console.error('No URLs found in dist/sitemap-0.xml — build first.');
  process.exit(1);
}

const body = {
  host: HOST,
  key,
  keyLocation: `https://${HOST}/${key}.txt`,
  urlList: urls,
};

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

console.log(`Submitted ${urls.length} URLs to IndexNow → HTTP ${res.status} ${res.statusText}`);
// 200 = accepted, 202 = accepted (validation pending). Both are success.
process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
