// Thin wrapper around fetch that injects the X-Admin-Token header that
// the backend's adminAuth middleware requires for /admin/* routes.
//
// Token is stored in sessionStorage. If missing or rejected (HTTP 401),
// the caller can invoke promptForToken() to pull a fresh value from the
// operator. The matching ADMIN_SECRET env var lives on Render.

const TOKEN_KEY = 'locale-admin-token';
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function getAdminToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

export function setAdminToken(token) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function clearAdminToken() {
  setAdminToken('');
}

export function promptForToken() {
  // eslint-disable-next-line no-alert
  const t = window.prompt('Admin token (X-Admin-Token). Find it on Render → Environment → ADMIN_SECRET.');
  if (t) setAdminToken(t);
  return t;
}

// adminFetch(path, options?) — path can be a relative '/admin/...' or
// absolute URL. Adds X-Admin-Token + content-type if there's a body.
// On 401, clears the cached token and rethrows so callers can re-prompt.
export async function adminFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const token = getAdminToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['X-Admin-Token'] = token;
  if (options.body && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearAdminToken();
    const text = await res.text().catch(() => '');
    const err = new Error('Admin token rejected (401). Click "Set token" in the header to re-enter it.');
    err.status = 401;
    err.body = text;
    throw err;
  }
  return res;
}

// Convenience: adminFetch + JSON parse + ok check.
export async function adminFetchJson(path, options = {}) {
  const res = await adminFetch(path, options);
  const json = await res.json().catch(() => ({ ok: false, error: 'invalid JSON' }));
  if (!json.ok && res.ok) json.ok = false; // tolerate endpoints that don't set ok
  return json;
}
