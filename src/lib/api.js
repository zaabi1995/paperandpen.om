import { isValidSubdomainCandidate, sanitizeSubdomainInput } from '@/lib/utils';

const DEFAULT_API_BASE = 'https://erp.paperandpen.om/api';
const BASE = (import.meta.env.VITE_API_URL || DEFAULT_API_BASE).replace(/\/+$/, '');

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

function isTrustedRedirectUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['erp.paperandpen.om', 'oman.paymob.com'].includes(url.hostname);
  } catch {
    return false;
  }
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body }),
};

export {
  BASE as API_BASE,
  checkSubdomainAvailability,
  initiateSignup,
  isTrustedRedirectUrl,
};
