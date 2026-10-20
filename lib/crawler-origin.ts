// GitHub project Pages share their account's origin; CORS cannot distinguish paths.
export const GITHUB_PAGES_ORIGIN = 'https://brainbytescreative1.github.io';

export function crawlerHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin',
  };
  if (request.headers.get('origin') === GITHUB_PAGES_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = GITHUB_PAGES_ORIGIN;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return headers;
}

export function allowedCrawlerOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin || origin === GITHUB_PAGES_ORIGIN;
}
