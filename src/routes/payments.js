const router = require('express').Router();
const { c } = require('../config/db');
const stripe = require('../config/stripe');
const { verifyToken, verifyCustomer } = require('../middlewares/auth');
const { oid, bad } = require('../utils/helpers');

async function savePayment(session) {
  if (session.payment_status !== 'paid') return null;
  const bid = oid(session.metadata?.bookingId);
  const b = bid && (await c.bookings.findOne({ _id: bid }));
  if (!b) return null;
  await c.payments.updateOne({ stripeSessionId: session.id }, { $setOnInsert: {
    bookingId: String(b._id), serviceTitle: b.serviceTitle, customerName: b.customerName, customerEmail: b.customerEmail,
    technicianName: b.technicianName, technicianEmail: b.technicianEmail, amount: session.amount_total / 100, currency: 'usd',
    transactionId: session.payment_intent, stripeSessionId: session.id, paymentStatus: 'paid', paidAt: new Date() } }, { upsert: true });
  await c.bookings.updateOne({ _id: b._id, paymentStatus: 'unpaid' }, { $set: { paymentStatus: 'paid' } });
  return c.payments.findOne({ stripeSessionId: session.id });
}

router.post('/create-checkout-session', verifyToken, verifyCustomer, async (req, res) => {
  const id = oid(req.body.bookingId);
  if (!id) return bad(res, 'Invalid booking');
  const b = await c.bookings.findOne({ _id: id, customerEmail: req.user.email });
  if (!b) return bad(res, 'Booking not found', 404);
  if (b.status !== 'completed' || b.paymentStatus !== 'unpaid') return bad(res, 'Only completed, unpaid bookings can be paid');
  const client = process.env.CLIENT_URL;
  const session = await stripe.checkout.sessions.create({
    mode: 'payment', customer_email: req.user.email,
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: Math.round(b.finalAmount * 100), product_data: { name: b.serviceTitle } } }],
    metadata: { bookingId: String(b._id), customerEmail: req.user.email },
    success_url: `${client}/payment/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${client}/payment/cancel`,
  });
  res.json({ url: session.url });
});

router.get('/verify', verifyToken, verifyCustomer, async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(String(req.query.session_id || ''));
  if (session.metadata?.customerEmail !== req.user.email) return bad(res, 'Forbidden', 403);
  if (session.payment_status !== 'paid') return bad(res, 'Payment not completed');
  res.json(await savePayment(session));
});

router.get('/my', verifyToken, verifyCustomer, async (req, res) => {
  res.json(await c.payments.find({ customerEmail: req.user.email }).sort({ paidAt: -1 }).toArray());
});

module.exports = router;
module.exports.savePayment = savePayment;
