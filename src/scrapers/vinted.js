/**
 * Minimal Vinted API client.
 * The `vinted-api` npm package has a bug where it passes the cookie module
 * object as the cookie header value instead of the actual session string.
 * This replaces it with a correct implementation.
 */

const fetch = require('node-fetch');

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

// Vinted now uses JWT-based cookies instead of the old session cookie
let cookieJar = null;

function parseCookies(setCookieHeaders) {
  const jar = {};
  for (const header of setCookieHeaders) {
    const [pair] = header.split(';');
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value) jar[name] = value;
  }
  return jar;
}

async function fetchCookie() {
  const res = await fetch('https://www.vinted.fr', {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Vinted homepage returned ${res.status} — likely rate-limited by Cloudflare`);
  }

  const setCookieHeaders = res.headers.raw()['set-cookie'] ?? [];
  const parsed = parseCookies(setCookieHeaders);

  if (!parsed['access_token_web']) {
    throw new Error('Could not find access_token_web cookie in Vinted response.');
  }

  cookieJar = parsed;
  console.log('[*] Cookie fetched.');
}

function buildCookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

// opts: { brandId, query, perPage, page }
async function searchPage({ brandId, query, perPage = 96, page = 1 } = {}) {
  if (!cookieJar) await fetchCookie();

  // Build query string manually so status_ids[] uses literal brackets (not %5B%5D)
  const parts = [
    `order=newest_first`,
    `per_page=${perPage}`,
    `page=${page}`,
    `status_ids[]=6`,   // 6 = For Sale on Vinted
  ];
  if (brandId) parts.push(`brand_ids=${brandId}`);
  if (query)   parts.push(`search_text=${encodeURIComponent(query)}`);

  const url = `https://www.vinted.fr/api/v2/catalog/items?${parts.join('&')}`;

  const res = await fetch(url, {
    headers: {
      cookie: buildCookieHeader(cookieJar),
      'user-agent': USER_AGENT,
      accept: 'application/json, text/plain, */*',
      'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  // Cloudflare/Datadome returns an HTML page when blocking — detect and throw clearly
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    // IP is rate-limited by Cloudflare — the cookie is still valid, don't reset it
    throw new Error(`Vinted returned non-JSON (${res.status}) — likely rate-limited`);
  }

  const data = await res.json();

  // If the session expired, refresh and retry once
  if (data.code === 100 || data.message_code === 'invalid_authentication_token') {
    console.log('[*] Session expired — refreshing cookie...');
    cookieJar = null;
    await fetchCookie();
    return searchPage({ brandId, query, perPage, page });
  }

  return {
    items: data.items ?? [],
    totalPages: data.pagination?.total_pages ?? 1,
    totalEntries: data.pagination?.total_entries ?? 0,
  };
}

// Fetch all pages up to maxPages (default: 1)
async function search({ brandId, query, perPage = 96, maxPages = 1 } = {}) {
  const first = await searchPage({ brandId, query, perPage, page: 1 });
  const allItems = [...first.items];

  const pagesToFetch = Math.min(maxPages, first.totalPages);

  for (let page = 2; page <= pagesToFetch; page++) {
    await new Promise((r) => setTimeout(r, 800));
    const result = await searchPage({ brandId, query, perPage, page });
    allItems.push(...result.items);
  }

  return { items: allItems, totalPages: first.totalPages, totalEntries: first.totalEntries };
}

module.exports = { search, fetchCookie };
