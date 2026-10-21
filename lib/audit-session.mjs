export const STORAGE_KEY = 'site-atlas-live-v2';
export function websiteURL(value) {
  const input = value.trim();
  if (!input) throw new Error('Enter a website to analyze.');
  const u = new URL(/^[a-z][\w+.-]*:\/\//i.test(input) ? input : 'https://' + input);
  if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.') || u.username || u.password) {
    throw new Error('Enter a public website using HTTP or HTTPS.');
  }
  u.hash = '';
  return u.href;
}
export function restoreAudit(storage) {
  try {
    // v1 mixed persistent sample data with live crawls. Never restore it.
    const d = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
    if (!d || d.mode !== 'live' || !d.runId || !d.site || !d.startedAt) return null;
    const origin = new URL(d.site).origin;
    const sameOrigin = x => new URL(typeof x === 'string' ? x : x.url).origin === origin;
    if (d.origin !== origin || ![d.pages,d.nav,d.queue,d.errors].every(Array.isArray) ||
      ![...d.pages,...d.nav,...d.queue,...d.errors].every(sameOrigin)) return null;
    return d;
  } catch { return null; }
}
export function verifyCrawlResponse(data, request) {
  if (!data || data.runId !== request.runId || data.origin !== request.origin || data.requestedUrl !== request.url) {
    throw new Error('The response does not match this crawl. Start a fresh analysis.');
  }
  if (request.action === 'discover') {
    if (!Array.isArray(data.urls) || !Array.isArray(data.notes)) throw new Error('Invalid sitemap response.');
    if (!data.urls.every(url => new URL(url).origin === request.origin)) throw new Error('The sitemap response contains a different website.');
  } else if (!data.url || new URL(data.url).origin !== request.origin || !Array.isArray(data.links) || !Array.isArray(data.features)) {
    throw new Error('The page response belongs to a different website or is incomplete.');
  }
  return data;
}
