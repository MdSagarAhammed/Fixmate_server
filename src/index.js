require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connect } = require('./config/db');

const app = express();
app.use(cors({ origin: (process.env.CLIENT_URLS || 'http://localhost:3000').split(','), credentials: true }));

app.post('/api/webhook', express.raw({ type: 'application/json' }), require('./routes/webhook'));
app.use(express.json());
app.use(async (req, res, next) => { try { await connect(); next(); } catch (e) { next(e); } });

app.get('/', (req, res) => res.send('FixMate API is running'));
app.use('/api/services', require('./routes/services'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));

if (!process.env.VERCEL) {
  app.listen(process.env.PORT || 5000, () => console.log('FixMate API on', process.env.PORT || 5000));
}
module.exports = app;
