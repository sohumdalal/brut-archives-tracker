const QUERY = 'Brut Archives';
const POLL_INTERVAL_MINUTES = parseInt(process.env.POLL_INTERVAL_MINUTES || '5', 10);

module.exports = { QUERY, POLL_INTERVAL_MINUTES };
