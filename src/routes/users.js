const router = require('express').Router();
const { c } = require('../config/db');
const { verifyToken } = require('../middlewares/auth');
const { bad } = require('../utils/helpers');

router.patch('/profile', verifyToken, async (req, res) => {
  const { name, phone, area, bio, image } = req.body;
  if (!name?.trim()) return bad(res, 'Name is required');
  const set = { name: name.trim(), phone: phone || '', area: area || '', bio: bio || '', updatedAt: new Date() };
  if (image) set.image = image;
  await c.users.updateOne({ email: req.user.email }, { $set: set });
  res.json({ ok: true });
});

router.get('/technician/:email', async (req, res) => {
  const u = await c.users.findOne({ email: req.params.email, role: 'technician' }, { projection: { name: 1, image: 1, area: 1, bio: 1 } });
  u ? res.json(u) : bad(res, 'Not found', 404);
});
module.exports = router;
