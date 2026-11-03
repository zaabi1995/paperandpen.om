// The public WhatsApp and phone is Anna's line +968 9116 1761 (Ali, 2 Nov 2026;
// BHD-2001, FU-7187). Kabir's 91117795 must not show on any page. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

test('no source or public file shows the old number 91117795', () => {
  const hits = [...files(join(ROOT, 'src')), ...files(join(ROOT, 'public'))]
    .filter((f) => /\.(astro|ts|json|txt|md|mdx|html)$/.test(f))
    .filter((f) => /91117795|9111 7795|9111-7795/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(hits, []);
});

test('schema telephone and WhatsApp link are the E.164 Anna line', () => {
  const schema = readFileSync(join(ROOT, 'src/lib/schema.ts'), 'utf8');
  assert.match(schema, /telephone: '\+96891161761'/);
  assert.match(schema, /https:\/\/api\.whatsapp\.com\/send\?phone=96891161761/);
});

test('the footer shows +968 9116 1761 and links api.whatsapp.com, not wa.me', () => {
  const footer = readFileSync(join(ROOT, 'src/components/layout/Footer.astro'), 'utf8');
  assert.match(footer, /\+968 9116 1761/);
  assert.match(footer, /api\.whatsapp\.com\/send\?phone=96891161761/);
  assert.equal(/wa\.me\//.test(footer), false);
});
