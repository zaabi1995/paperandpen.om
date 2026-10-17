import { isValidSubdomainCandidate, sanitizeSubdomainInput } from '@/lib/utils';

const DEFAULT_API_BASE = 'https://erp.paperandpen.om/api';
// Astro hands the browser only PUBLIC_ variables, so VITE_API_URL never reached
// it and every build talked to production. PUBLIC_API_URL points a build at
// another API (staging: https://erp.staging.paperandpen.om/api). Unset in the
// production build, so production keeps the default.
const BASE = (import.meta.env.PUBLIC_API_URL || DEFAULT_API_BASE).replace(/\/+$/, '');

function buildUrl(path, params) {
  const url = new URL(`${BASE}${path}`, window.location.origin);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

async function request(method, path, { body, params } = {}) {
  let res;

  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Unable to reach the server. Please try again.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export function parseSubdomainAvailabilityResponse(data) {
  if (!data || typeof data !== 'object' || typeof data.available !== 'boolean') {
    throw new Error('Invalid subdomain availability response');
  }

  return { available: data.available };
}

export function normalizeSubdomainCandidate(value) {
  const normalized = sanitizeSubdomainInput(value);

  if (!isValidSubdomainCandidate(normalized)) {
    throw new Error('Please enter a valid subdomain.');
  }

  return normalized;
}

async function checkSubdomainAvailability(subdomain) {
  const normalized = normalizeSubdomainCandidate(subdomain);
  const data = await request('GET', '/pnp-billing/check-subdomain', { params: { id: normalized } });
  return parseSubdomainAvailabilityResponse(data);
}

async function initiateSignup(payload) {
  return request('POST', '/pnp-billing/signup/initiate', { body: payload });
}

/*
 * Where a signup may send the browser. The free path answers with the new
 * workspace, https://<id>.paperandpen.om/login/code, so every paperandpen.om
 * subdomain is trusted (staging tenants are <id>.staging.paperandpen.om). The
 * paid path answers with the Paymob checkout. Anything else is refused.
 */
function isTrustedRedirectUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    // erp.bhd.om/pay/checkout: the card check runs there so Apple Pay works
    // (Apple Pay is registered per domain; FU-4126, Ali 17 Oct 2026).
    if (url.hostname === 'erp.bhd.om') return url.pathname === '/pay/checkout';
    return url.hostname === 'oman.paymob.com' || url.hostname.endsWith('.paperandpen.om');
  } catch {
    return false;
  }
}

/*
 * The modules a person can pick at signup, at the price the backend charges.
 * Public: GET /api/pnp-billing/signup/modules. Returns [] on any failure, so the
 * form falls back to its own list instead of breaking.
 */
async function fetchSignupModules() {
  try {
    const data = await request('GET', '/pnp-billing/signup/modules');
    const list = Array.isArray(data?.result) ? data.result : [];
    return list.filter((m) => m && typeof m.code === 'string' && typeof m.priceOMR === 'number');
  } catch {
    return [];
  }
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body }),
};

export {
  BASE as API_BASE,
  checkSubdomainAvailability,
  fetchSignupModules,
  initiateSignup,
  isTrustedRedirectUrl,
};
