export function slugifySubdomain(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}
export function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
