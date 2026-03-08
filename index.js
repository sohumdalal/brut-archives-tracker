require('dotenv').config();
const { startServer } = require('./src/server');
const { start }       = require('./src/poller');

startServer();
start();
