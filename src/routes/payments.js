const router = require('express').Router();
const { c } = require('../config/db');
const stripe = require('../config/stripe');
const { verifyToken, verifyCustomer } = require('../middlewares/auth');
const { oid, bad } = require('../utils/helpers');

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