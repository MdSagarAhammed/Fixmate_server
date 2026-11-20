const router = require('express').Router();
const { c } = require('../config/db');
const { verifyToken, verifyTechnician } = require('../middlewares/auth');
const { oid, esc, bad, CATEGORIES, MODES } = require('../utils/helpers');

const SORTS = { 'price-asc': { basePrice: 1 }, 'price-desc': { basePrice: -1 }, newest: { createdAt: -1 } };

function validate(b) {
  const { title, category, description, image, basePrice, estimatedDuration, serviceMode, serviceArea } = b;
  if (!title?.trim() || !description?.trim() || !estimatedDuration?.trim() || !serviceArea?.trim() || !image) return 'All fields are required';
  if (!CATEGORIES.includes(category)) return 'Invalid category';
  if (!MODES.includes(serviceMode)) return 'Invalid service mode';
  if (!(Number(basePrice) > 0)) return 'Base price must be a positive number';
  return null;
}
const pick = (b) => ({ title: b.title.trim(), category: b.category, description: b.description.trim(), image: b.image,
  basePrice: Number(b.basePrice), estimatedDuration: b.estimatedDuration.trim(), serviceMode: b.serviceMode, serviceArea: b.serviceArea.trim() });

router.get('/', async (req, res) => {
  const { q, category, mode, sort = 'newest', limit } = req.query;
  const filter = { approvalStatus: 'approved', isAvailable: true };
  if (category) filter.category = category;
  if (mode) filter.serviceMode = mode;
  if (q?.trim()) { const r = new RegExp(esc(q.trim()), 'i'); filter.$or = [{ title: r }, { category: r }]; }
  let cur = c.services.find(filter).sort(SORTS[sort] || SORTS.newest);
  if (Number(limit) > 0) cur = cur.limit(Math.min(Number(limit), 50));
  res.json(await cur.toArray());
});

router.get('/:id', async (req, res) => {
  const id = oid(req.params.id);
  if (!id) return bad(res, 'Service not found', 404);
  const s = await c.services.findOne({ _id: id, approvalStatus: 'approved', isAvailable: true });
  s ? res.json(s) : bad(res, 'Service not found', 404);
});