// Runs before `astro build`. Fetches the signup module prices from the ERP API
// and writes src/lib/signupModules.snapshot.json, the list the form shows
// before its live call answers. If the API does not answer, the committed
// snapshot stays and the build goes on.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../src/lib/signupModules.snapshot.json', import.meta.url));
const BASE = (process.env.PUBLIC_API_URL || 'https://erp.paperandpen.om/api').replace(/\/+$/, '');

export function validList(data) {
  const list = Array.isArray(data?.result) ? data.result : [];
  return list
    .filter((m) => m && typeof m.code === 'string' && typeof m.priceOMR === 'number' && m.priceOMR >= 0)
    .map((m) => ({ code: m.code, priceOMR: m.priceOMR }));
}

async function main() {
  try {
    const res = await fetch(`${BASE}/pnp-billing/signup/modules`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = validList(await res.json());
    if (!list.length) throw new Error('empty list');
    const old = JSON.parse(readFileSync(FILE, 'utf8'));
    const next = JSON.stringify(list, null, 2) + '\n';
    if (next !== JSON.stringify(old, null, 2) + '\n') writeFileSync(FILE, next);
    console.log(`signup modules: ${list.length} fetched from ${BASE}`);
  } catch (err) {
    console.warn(`signup modules: keeping the committed snapshot (${err.message})`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
