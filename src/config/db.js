const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);
const c = {};
let ready;
async function connect() {
  if (!ready) {
    ready = (async () => {
      await client.connect();
      const db = client.db(process.env.DB_NAME || 'fixmate3');
      c.users = db.collection('user'); 
      c.services = db.collection('services');
      c.bookings = db.collection('bookings');
      c.payments = db.collection('payments');
      await c.payments.createIndex({ stripeSessionId: 1 }, { unique: true });
    })();
  }
  return ready;
}
module.exports = { c, connect };
