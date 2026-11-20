const jwt = require('jsonwebtoken');
const { c } = require('../config/db');

async function verifyToken(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const { email } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await c.users.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    req.user = { id: String(user._id), email: user.email, name: user.name, image: user.image, role: user.role || 'customer' };
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized' });
  }
}
const requireRole = (role) => (req, res, next) =>
  req.user?.role === role ? next() : res.status(403).json({ message: 'Forbidden' });

module.exports = {
  verifyToken,
  verifyCustomer: requireRole('customer'),
  verifyTechnician: requireRole('technician'),
  verifyAdmin: requireRole('admin'),
};
