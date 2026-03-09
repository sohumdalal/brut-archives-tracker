# brut-archives-tracker

Aggregates Brut Archives listings from Vinted (.com, .co.uk, .fr), Grailed, Depop, and eBay. Polls every 5 minutes and surfaces new listings in a simple frontend at `localhost:3000`.

> **Run this locally, not on a cloud host.** Vinted and Depop's bot protection blocks datacenter IPs. A home IP works fine.

## Setup

```bash
npm install
npx playwright install chromium   # for Depop scraper
cp .env.example .env
# edit .env if needed
node index.js
```

## Running 24/7 with pm2

```bash
npm install -g pm2
pm2 start index.js --name brut-tracker
pm2 save
pm2 startup   # follow the printed command to auto-start on reboot
```

Useful commands:

```bash
pm2 logs brut-tracker     # live logs
pm2 status                # check running status
pm2 restart brut-tracker  # restart
pm2 stop brut-tracker     # stop
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `POLL_INTERVAL_MINUTES` | `5` | How often to poll all platforms |
| `EBAY_CLIENT_ID` | — | eBay Browse API client ID (free at developer.ebay.com) |
| `EBAY_CLIENT_SECRET` | — | eBay Browse API client secret |

eBay credentials are optional — the scraper skips gracefully until they're added.

## Project structure

```
src/
  config.js          # query string, poll interval
  db.js              # JSON file store (items.json), insert + query
  poller.js          # cron loop, runs all scrapers
  server.js          # Express — serves frontend + /api/items
  scrapers/
    vinted.js        # Vinted API (.com, .co.uk, .fr in parallel)
    grailed.js       # Grailed via Algolia search API
    depop.js         # Depop via Playwright (headless Chrome)
    ebay.js          # eBay Browse API (OAuth2, skips if no credentials)
public/
  index.html         # frontend — card grid, platform filters, sort
items.json           # auto-generated, persists seen listings
```

## To-do

- [ ] **Refresh animation** — smooth the feed update so new rows fade/slide in instead of a hard re-render
- [ ] **UI density** — reduce side padding, make feed rows more boxy/square
- [ ] **Size filter** — add a size selector to the filter bar so you can narrow results to your size across all platforms
- [ ] **Multi-brand input** — let the user type in any brand name (not just Brut Archives) and have all scrapers search for it dynamically across Vinted, Grailed, Depop, and eBay

## Platform notes

| Platform | Method | Auth |
|---|---|---|
| Vinted | Internal API | Anonymous cookie (JWT) |
| Grailed | Algolia search API | Public search-only key |
| Depop | Playwright (headless Chrome) | None — bypasses bot detection |
| eBay | Browse API (official) | OAuth2 app token (free tier) |
