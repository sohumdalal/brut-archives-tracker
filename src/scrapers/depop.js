/**
 * Depop scraper using Depop's internal web API.
 */

const fetch = require('node-fetch');

const BASE_URL = 'https://webapi.depop.com/api/v2/search/products/';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'depop-locale': 'en-GB',
  'Accept-Language': 'en-GB,en;q=0.9',
};

function normalizeProduct(product) {
  // Price: Depop returns { priceAmount: "45.00", currencyName: "USD" }
  const priceObj = product.price ?? null;
  const price = priceObj?.priceAmount ?? null;
  const currency = priceObj?.currencyName ?? null;

  // Image: preview is an array of objects with a url field
  const preview = product.preview ?? [];
  const imageUrl = preview[0]?.url ?? null;

  // URL: built from slug
  const slug = product.slug ?? null;
  const itemUrl = slug
    ? `https://www.depop.com/products/${slug}/`
    : `https://www.depop.com/products/${product.id}/`;

  // Size: sizes is an array of objects with a display field
  const sizes = product.sizes ?? [];
  const size = sizes[0]?.display ?? null;

  // Title: use description, trimmed to 100 chars if long
  const rawTitle = String(product.description ?? '').trim();
  const title = rawTitle.length > 100 ? rawTitle.slice(0, 100) : rawTitle;

  return {
    id: `depop:${product.id}`,
    platform: 'depop',
    title,
    price,
    currency,
    imageUrl,
    itemUrl,
    size,
    condition: null, // Depop does not expose condition in search results
  };
}

async function search(query) {
  const params = new URLSearchParams({
    q: query,
    itemsPerPage: '48',
    country: 'gb',
    currency: 'USD',
  });

  const url = `${BASE_URL}?${params}`;

  const res = await fetch(url, { headers: HEADERS });

  // Detect non-JSON responses (e.g. Cloudflare blocks, HTML error pages)
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Depop returned non-JSON response (HTTP ${res.status}) — likely rate-limited or blocked`
    );
  }

  if (!res.ok) {
    throw new Error(`Depop API returned ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // The API returns a `products` array; adapt gracefully if the shape differs
  const products = data.products ?? data.items ?? data.results ?? [];

  return products
    .filter((p) => {
      // Only include active listings; skip sold items when detectable
      const status = p.status ?? '';
      return status === '' || status === 'Active' || status.toLowerCase() === 'active';
    })
    .map(normalizeProduct);
}

module.exports = { search };
