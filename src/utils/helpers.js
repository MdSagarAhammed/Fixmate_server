const { ObjectId } = require('mongodb');
const oid = (id) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const bad = (res, msg, code = 400) => res.status(code).json({ message: msg });
const CATEGORIES = ['Smartphone', 'Laptop & PC', 'AC', 'Refrigerator', 'TV', 'Washing Machine', 'Electrical'];
const MODES = ['Home Visit', 'Shop Drop-off'];

const TRANSITIONS = {
  requested: { accepted: 'technician', rejected: 'technician', cancelled: 'customer' },
  accepted: { 'in-progress': 'technician' },
  'in-progress': { completed: 'technician' },
};
module.exports = { oid, esc, bad, CATEGORIES, MODES, TRANSITIONS };
