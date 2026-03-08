const cron = require('node-cron');
const { insertItem } = require('./db');
const { QUERY, POLL_INTERVAL_MINUTES } = require('./config');

const SCRAPERS = [
  { name: 'vinted',  fn: require('./scrapers/vinted').search  },
  { name: 'grailed', fn: require('./scrapers/grailed').search },
  { name: 'depop',   fn: require('./scrapers/depop').search   },
  { name: 'ebay',    fn: require('./scrapers/ebay').search    },
];

function ts() {
  return new Date().toLocaleTimeString();
}

async function poll() {
  console.log(`[${ts()}] Polling "${QUERY}"...`);

  for (const { name, fn } of SCRAPERS) {
    try {
      const items = await fn(QUERY);
      let newCount = 0;
      for (const item of items) {
        const result = insertItem(item);
        if (result.changes > 0) newCount++;
      }
      console.log(`[${ts()}] ${name} → ${items.length} fetched, ${newCount} new`);
    } catch (err) {
      console.warn(`[${ts()}] ${name} skipped: ${err.message}`);
    }
  }
}

function start() {
  console.log(`brut-archives-tracker`);
  console.log(`Polling every ${POLL_INTERVAL_MINUTES} min\n`);
  poll();
  cron.schedule(`*/${POLL_INTERVAL_MINUTES} * * * *`, poll);
}

module.exports = { start, poll };
