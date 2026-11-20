const router = require('express').Router();
const { c } = require('../config/db');
const { verifyToken, verifyCustomer, verifyTechnician } = require('../middlewares/auth');
const { oid, bad, TRANSITIONS } = require('../utils/helpers');

router.post('/', verifyToken, verifyCustomer, async (req, res) => {
  const { serviceId, phone, address, preferredDate, problemDescription } = req.body;
  const sid = oid(serviceId);
  if (!sid) return bad(res, 'Invalid service');
  if (!phone?.trim() || !address?.trim()) return bad(res, 'Phone and address are required');
  if ((problemDescription || '').trim().length < 20) return bad(res, 'Problem description must be at least 20 characters');
  const date = new Date(preferredDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (isNaN(date) || date < today) return bad(res, 'Preferred date must be today or later');

  const s = await c.services.findOne({ _id: sid, approvalStatus: 'approved', isAvailable: true });
  if (!s) return bad(res, 'Service not available', 404);
  if (s.technicianEmail === req.user.email) return bad(res, 'You cannot request your own service', 403);

  const dup = await c.bookings.findOne({ serviceId: String(sid), customerEmail: req.user.email, status: { $in: ['requested', 'accepted', 'in-progress'] } });
  if (dup) return bad(res, 'You already have an active request for this service', 409);

  const doc = { serviceId: String(sid), serviceTitle: s.title, serviceImage: s.image, category: s.category, basePrice: s.basePrice,
    technicianName: s.technicianName, technicianEmail: s.technicianEmail, customerName: req.user.name, customerEmail: req.user.email,
    customerPhone: phone.trim(), address: address.trim(), preferredDate: date, problemDescription: problemDescription.trim(),
    status: 'requested', finalAmount: s.basePrice, paymentStatus: 'unpaid', createdAt: new Date() };
  const r = await c.bookings.insertOne(doc);
  res.status(201).json({ ...doc, _id: r.insertedId });
});

router.get('/my', verifyToken, verifyCustomer, async (req, res) => {
  res.json(await c.bookings.find({ customerEmail: req.user.email }).sort({ createdAt: -1 }).toArray());
});

router.get('/technician', verifyToken, verifyTechnician, async (req, res) => {
  res.json(await c.bookings.find({ technicianEmail: req.user.email }).sort({ createdAt: -1 }).toArray());
});

router.patch('/:id/cancel', verifyToken, verifyCustomer, async (req, res) => {
  const id = oid(req.params.id);
  if (!id) return bad(res, 'Invalid id');
  const r = await c.bookings.updateOne({ _id: id, customerEmail: req.user.email, status: 'requested' }, { $set: { status: 'cancelled' } });
  r.matchedCount ? res.json({ ok: true }) : bad(res, 'Only your own requested bookings can be cancelled', 400);
});

router.patch('/:id/status', verifyToken, verifyTechnician, async (req, res) => {
  const id = oid(req.params.id);
  if (!id) return bad(res, 'Invalid id');
  const b = await c.bookings.findOne({ _id: id, technicianEmail: req.user.email });
  if (!b) return bad(res, 'Booking not found', 404);
  const next = req.body.status;
  const allowed = TRANSITIONS[b.status]?.[next];
  if (allowed !== 'technician') return bad(res, `Cannot change status from ${b.status} to ${next}`, 400);
  const set = { status: next };
  if (next === 'completed') {
    const amt = Number(req.body.finalAmount);
    if (!(amt > 0)) return bad(res, 'finalAmount must be greater than 0');
    set.finalAmount = amt;
  }
  await c.bookings.updateOne({ _id: id }, { $set: set });
  res.json({ ok: true });
});

module.exports = router;