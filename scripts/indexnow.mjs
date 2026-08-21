// Submit all site URLs to IndexNow (Bing, Yandex, Seznam) for instant indexing.
// Usage: node scripts/indexnow.mjs
// Reads the tracked verification key and URLs from the built output.
import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = 'paperandpen.om';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(scriptDir, '../public');
const keyFiles = readdirSync(publicDir).filter((name) => /^[a-f0-9]{32}\.txt$/.test(name));
if (keyFiles.length !== 1) {
  console.error(`Expected one tracked IndexNow key file, found ${keyFiles.length}.`);
  process.exit(1);
}
const keyFile = resolve(publicDir, keyFiles[0]);
const key = readFileSync(keyFile, 'utf8').trim();
if (key !== basename(keyFile, '.txt')) {
  console.error('Tracked IndexNow key filename and content do not match.');
  process.exit(1);
}

const xml = readFileSync(new URL('../dist/sitemap-0.xml', import.meta.url), 'utf8');
const sitemapUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const discoveryUrls = [
  `https://${HOST}/llms.txt`,
  `https://${HOST}/.well-known/agent-skills/index.json`,
  `https://${HOST}/.well-known/api-catalog`,
  `https://${HOST}/sitemap-index.xml`,
];
const urls = [...new Set([...sitemapUrls, ...discoveryUrls])];
if (!urls.length) {
  console.error('No URLs found in dist/sitemap-0.xml. Build first.');
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
