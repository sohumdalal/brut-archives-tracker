/**
 * Grailed scraper using Grailed's public Algolia search API.
 */

const fetch = require('node-fetch');

const ALGOLIA_APP_ID = 'MNRWEFSS2Q';
const ALGOLIA_API_KEY = 'c89dbaddf15fe70e1941a109bf7c2a3d';
const ALGOLIA_INDEX = 'Listing_by_date_added_production';

const ALGOLIA_URL = `https://${ALGOLIA_APP_ID}.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;

function normalizeHit(hit) {
  const imageUrl = hit.photos?.[0]?.url ?? null;

  const itemUrl = hit.slug
    ? `https://www.grailed.com/listings/${hit.id}-${hit.slug}`
    : `https://www.grailed.com/listings/${hit.id}`;

  return {
    id: `grailed:${hit.id}`,
    platform: 'grailed',
    title: String(hit.title ?? ''),
    price: Number(hit.price ?? 0).toFixed(2),
    currency: 'USD',
    imageUrl,
    itemUrl,
    size: hit.size ?? null,
    condition: hit.condition ?? null,
  };
}

async function search(query) {
  const res = await fetch(ALGOLIA_URL, {
    method: 'POST',
    headers: {
      'x-algolia-application-id': ALGOLIA_APP_ID,
      'x-algolia-api-key': ALGOLIA_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      hitsPerPage: 48,
      filters: 'sold:false',
    }),
  });

  if (!res.ok) {
    throw new Error(`Grailed Algolia API returned ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  const hits = data.hits ?? [];

  const items = hits
    .filter((hit) => hit.sold !== true)
    .map(normalizeHit);

  return items;
}

module.exports = { search };
