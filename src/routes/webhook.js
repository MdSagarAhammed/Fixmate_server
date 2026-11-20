const stripe = require('../config/stripe');
const { connect } = require('../config/db');
const { savePayment } = require('./payments');

module.exports = async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).send(`Webhook error: ${e.message}`);
  }
  await connect();
  if (event.type === 'checkout.session.completed') await savePayment(event.data.object);
  res.json({ received: true });
};
