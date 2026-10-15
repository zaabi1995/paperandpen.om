/**
 * First-touch attribution (BHD-664, FU-3908): where this visitor FIRST came from.
 *
 * On the first page view only, keep utm_source and utm_campaign from the
 * landing URL and the referrer's host (only when it is another site) in
 * localStorage. Later visits never overwrite it, so a visitor who first came
 * from an Instagram ad and returns a week later by typing the address still
 * counts as Instagram. The signup / enquiry form sends it with the request and
 * the ERP stores it on the row (utmSource, utmCampaign, referrerHost).
 *
 * First party only: nothing here leaves the browser except inside the form
 * the visitor chooses to send. No storage (private mode, blocked) = no
 * attribution, never a broken form.
 */
const KEY = 'bhd_first_touch';

const clean = (v, max) => String(v || '').trim().toLowerCase().slice(0, max);
const bare = (h) => String(h || '').toLowerCase().replace(/^www\./, '');

export function captureFirstTouch() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return JSON.parse(saved);
    const params = new URLSearchParams(window.location.search);
    let referrerHost = '';
    try {
      const ref = document.referrer ? new URL(document.referrer).hostname : '';
      if (ref && bare(ref) !== bare(window.location.hostname)) referrerHost = clean(ref, 120);
    } catch { /* not a URL */ }
    const touch = {
      utm_source: clean(params.get('utm_source'), 64),
      utm_campaign: clean(params.get('utm_campaign'), 64),
      referrer_host: referrerHost,
      landing_path: window.location.pathname.slice(0, 200),
      at: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(touch));
    return touch;
  } catch {
    return null;
  }
}

/** The fields the ERP accepts, ready to send as `firstTouch` in a form body. */
export function firstTouchPayload() {
  const t = captureFirstTouch();
  if (!t) return undefined;
  const out = {};
  for (const k of ['utm_source', 'utm_campaign', 'referrer_host']) if (t[k]) out[k] = t[k];
  return Object.keys(out).length ? out : undefined;
}
