const router = require('express').Router();
const { c } = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middlewares/auth');
const { oid, bad } = require('../utils/helpers');
router.use(verifyToken, verifyAdmin);

router.get('/stats', async (req, res) => {
  const [users, technicians, pendingServices, bookings, revenue] = await Promise.all([
    c.users.countDocuments(), c.users.countDocuments({ role: 'technician' }), c.services.countDocuments({ approvalStatus: 'pending' }),
    c.bookings.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
    c.payments.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]).toArray()]);
  res.json({ users, technicians, pendingServices, bookingsByStatus: bookings, revenue: revenue[0]?.total || 0 });
});
router.get('/users', async (req, res) => res.json(await c.users.find({}, { projection: { name: 1, email: 1, image: 1, role: 1, createdAt: 1 } }).sort({ createdAt: -1 }).toArray()));
router.patch('/users/:id/role', async (req, res) => {
  const id = oid(req.params.id);
  if (!id) return bad(res, 'Invalid id');
  if (!['customer', 'technician', 'admin'].includes(req.body.role)) return bad(res, 'Invalid role');
  if (String(id) === req.user.id) return bad(res, 'You cannot change your own role', 403);
  await c.users.updateOne({ _id: id }, { $set: { role: req.body.role } });
  res.json({ ok: true });
});
router.get('/services', async (req, res) => res.json(await c.services.find({}).sort({ createdAt: -1 }).toArray()));
router.patch('/services/:id/approval', async (req, res) => {
  const id = oid(req.params.id);
  if (!id || !['approved', 'rejected'].includes(req.body.approvalStatus)) return bad(res, 'Invalid request');
  await c.services.updateOne({ _id: id }, { $set: { approvalStatus: req.body.approvalStatus } });
  res.json({ ok: true });
});
router.get('/bookings', async (req, res) => res.json(await c.bookings.find({}).sort({ createdAt: -1 }).toArray()));
router.get('/payments', async (req, res) => res.json(await c.payments.find({}).sort({ paidAt: -1 }).toArray()));
module.exports = router;
