/*
 * The 17 module codes the signup API accepts (backend SIGNUP_MODULE_PRICES), in
 * the order the form shows them, with the backend's default monthly price in
 * OMR. The live price comes from GET /api/pnp-billing/signup/modules; this table
 * is only what shows before that answers, or if it never does. Keep it equal to
 * the backend defaults: three of the old five prices here were wrong (FU-4127).
 */
export const SIGNUP_MODULES: { key: string; price: number }[] = [
  { key: 'inventory', price: 6 },
  { key: 'accounting', price: 10 },
  { key: 'hr', price: 8 },
  { key: 'manufacturing', price: 10 },
  { key: 'reports', price: 6 },
  { key: 'crm', price: 5 },
  { key: 'pos', price: 4 },
  { key: 'ecommerce', price: 8 },
  { key: 'loyalty', price: 3 },
  { key: 'portal', price: 4 },
  { key: 'banking', price: 8 },
  { key: 'projects', price: 5 },
  { key: 'delivery', price: 3 },
  { key: 'stock_reports', price: 3 },
  { key: 'knowledge_base', price: 2 },
  { key: 'surveys', price: 2 },
  { key: 'pdf_designer', price: 3 },
];

/** Live prices over the fallback table. Unknown codes from the API are ignored. */
export function withLivePrices(live: { code: string; priceOMR: number }[]) {
  const byCode = new Map(live.map((m) => [m.code, m.priceOMR]));
  return SIGNUP_MODULES.map((m) => ({ key: m.key, price: byCode.get(m.key) ?? m.price }));
}

/** A pack id from ?template=: lowercase letters, digits and hyphens. The backend checks it is real. */
export function parseTemplate(value: string | null) {
  const v = (value || '').trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(v) ? v : '';
}
