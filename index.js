require('dotenv').config();
const vinted = require('vinted-api');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MINUTES = parseInt(process.env.POLL_INTERVAL_MINUTES || '5', 10);

const SEARCH_QUERIES = [
  'Brut Archives',
  'Brut Paris',
  'Brut clothing',
  'Brut',
];

// Build Vinted search URLs for vinted.fr
const searchUrls = SEARCH_QUERIES.map((q) => ({
  label: q,
  url: `https://www.vinted.fr/catalog?search_text=${encodeURIComponent(q)}&order=newest_first`,
}));

const SEEN_FILE = path.join(__dirname, 'seen.json');

// ── Persistence ──────────────────────────────────────────────────────────────

function loadSeen() {
  try {
    return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')));
  } catch {
    return new Set();
  }
}

function saveSeen(seenSet) {
  fs.writeFileSync(SEEN_FILE, JSON.stringify([...seenSet]), 'utf8');
}

// ── Email ────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function buildEmailHtml(newItems) {
  const rows = newItems
    .map(
      ({ item, query }) => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #eee;vertical-align:top;width:80px;">
          ${
            item.photo?.url
              ? `<img src="${item.photo.url}" width="70" style="border-radius:4px;" />`
              : ''
          }
        </td>
        <td style="padding:12px;border-bottom:1px solid #eee;vertical-align:top;">
          <strong><a href="${item.url}" style="color:#1a1a1a;text-decoration:none;">${item.title}</a></strong><br/>
          <span style="color:#555;font-size:13px;">€${item.total_item_price ?? item.price} &nbsp;·&nbsp; matched: <em>${query}</em></span><br/>
          <a href="${item.url}" style="display:inline-block;margin-top:6px;padding:5px 12px;background:#333;color:#fff;font-size:12px;border-radius:4px;text-decoration:none;">View on Vinted</a>
        </td>
      </tr>`
    )
    .join('');

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;">
      <h2 style="border-bottom:2px solid #333;padding-bottom:8px;">
        🧥 New Brut listing${newItems.length > 1 ? 's' : ''} on Vinted
      </h2>
      <table style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
      <p style="color:#999;font-size:11px;margin-top:16px;">
        Sent by vinted-brut-notifier · polling every ${POLL_INTERVAL_MINUTES} min
      </p>
    </div>`;
}

async function sendNotification(newItems) {
  await transporter.sendMail({
    from: `"Vinted Notifier" <${process.env.GMAIL_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `[Vinted] ${newItems.length} new Brut listing${newItems.length > 1 ? 's' : ''}`,
    html: buildEmailHtml(newItems),
  });
  console.log(`[${now()}] Email sent — ${newItems.length} new item(s).`);
}

// ── Polling ──────────────────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString();
}

async function poll() {
  const seen = loadSeen();
  const newItems = [];

  for (const { label, url } of searchUrls) {
    try {
      const result = await vinted.search(url);
      const items = result?.items ?? [];

      for (const item of items) {
        const id = String(item.id);
        if (!seen.has(id)) {
          seen.add(id);
          newItems.push({ item, query: label });
        }
      }

      console.log(
        `[${now()}] "${label}" — ${items.length} items fetched, ${
          newItems.filter((n) => n.query === label).length
        } new.`
      );
    } catch (err) {
      console.error(`[${now()}] Error searching "${label}":`, err.message);
    }

    // Small delay between requests to be polite to the API
    await new Promise((r) => setTimeout(r, 1500));
  }

  saveSeen(seen);

  if (newItems.length > 0) {
    await sendNotification(newItems);
  } else {
    console.log(`[${now()}] No new items found.`);
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────

console.log(`Vinted Brut Notifier started — polling every ${POLL_INTERVAL_MINUTES} min.`);
console.log(`Watching: ${SEARCH_QUERIES.join(', ')}\n`);

// Run immediately on startup
poll();

// Then on a cron schedule
const cronExpr = `*/${POLL_INTERVAL_MINUTES} * * * *`;
cron.schedule(cronExpr, poll);
