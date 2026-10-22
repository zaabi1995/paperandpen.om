import snapshot from './signupModules.snapshot.json' with { type: 'json' };

/*
 * The module codes the signup form shows, in the order it shows them. The
 * site has a title and description for each of these (modules.<code>.*), so a
 * code the API adds later (car_care) stays off the form until the site has its
 * words.
 */
export const MODULE_ORDER = [
  'inventory', 'accounting', 'hr', 'manufacturing', 'reports', 'crm', 'pos', 'ecommerce',
  'loyalty', 'portal', 'banking', 'projects', 'delivery', 'stock_reports', 'knowledge_base',
  'surveys', 'pdf_designer',
];

type PricedModule = { code: string; priceOMR: number };

/*
 * Prices come from the backend (GET /api/pnp-billing/signup/modules), never
 * from this repo. signupModules.snapshot.json is the list the last build
 * fetched (scripts/fetch_signup_modules.mjs runs before every build); it shows
 * before the live call answers, or if that call never does.
 */
function priced(list: PricedModule[], base: { key: string; price: number }[] = []) {
  const byCode = new Map(list.map((m) => [m.code, m.priceOMR]));
  const before = new Map(base.map((m) => [m.key, m.price]));
  return MODULE_ORDER.flatMap((key) => {
    const price = byCode.get(key) ?? before.get(key);
    return typeof price === 'number' ? [{ key, price }] : [];
  });
}

export const SIGNUP_MODULES: { key: string; price: number }[] = priced(snapshot as PricedModule[]);

/** Live prices over the build-time list. Unknown codes from the API are ignored. */
export function withLivePrices(live: PricedModule[]) {
  return priced(live, SIGNUP_MODULES);
}

/** A pack id from ?template=: lowercase letters, digits and hyphens. The backend checks it is real. */
export function parseTemplate(value: string | null) {
  const v = (value || '').trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(v) ? v : '';
}
