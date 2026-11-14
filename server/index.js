require('dotenv').config();
require('express-async-errors'); // lets errors inside async routes reach the error handler instead of crashing
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Stop with a clear message if the .env file is missing or incomplete
const missing = ['MONGO_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing in server/.env: ${missing.join(', ')}. Create the .env file (copy .env.example) and fill it in.`);
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/passengers', require('./routes/passengers'));
app.use('/api/users', require('./routes/users'));
app.use('/api/events', require('./routes/events'));
app.use('/api/records', require('./routes/records'));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));

// Any error ends here with a clean message instead of crashing the server
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return;
  if (err && err.name === 'CastError') return res.status(400).json({ message: 'Invalid request' });
  if (err && err.name === 'ValidationError') return res.status(400).json({ message: 'Please check the details and try again' });
  if (err && err.code === 11000) return res.status(400).json({ message: 'This already exists' });
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid request' });
  res.status(500).json({ message: 'Server error' });
});

process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => app.listen(process.env.PORT || 5000, () => console.log('API running')))
  .catch((e) => console.error('MongoDB connection failed', e.message));
