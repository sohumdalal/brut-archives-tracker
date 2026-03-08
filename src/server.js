const express = require('express');
const path    = require('path');
const { getItems } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/items', (req, res) => {
  const { platform } = req.query;
  const limit = req.query.limit ? parseInt(req.query.limit) : 200;
  res.json(getItems({ platform, limit }));
});

function startServer() {
  app.listen(PORT, () => {
    console.log(`Frontend → http://localhost:${PORT}`);
  });
}

module.exports = { startServer };
