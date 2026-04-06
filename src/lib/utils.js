export const MAX_SUBDOMAIN_LENGTH = 50;

export function sanitizeSubdomainInput(value, maxLength = Number.POSITIVE_INFINITY) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, maxLength);
}

export function isValidSubdomainCandidate(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_SUBDOMAIN_LENGTH;
}

export function slugifySubdomain(str) {
  return sanitizeSubdomainInput(str, MAX_SUBDOMAIN_LENGTH);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
