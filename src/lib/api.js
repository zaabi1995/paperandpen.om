const BASE = import.meta.env.VITE_API_URL || '/api';
async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
export const api = { get: (path) => request('GET', path), post: (path, body) => request('POST', path, body) };
export const checkSubdomain = (subdomain) => api.post('/public/check-subdomain', { subdomain });
export const submitSignup = (payload) => api.post('/public/signup', payload);
export const loginUser = (credentials) => api.post('/auth/login', credentials);
