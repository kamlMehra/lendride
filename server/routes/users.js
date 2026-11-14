const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User, Trip } = require('../models');
const { auth, coordinatorOnly } = require('../middleware');
const { str } = require('../util');

router.use(auth, coordinatorOnly);

const coordinatorCount = () => User.countDocuments({ role: 'coordinator' });

router.get('/', async (req, res) => {
  const users = await User.find().select('name phone role').sort('name').lean();
  const counts = await Trip.aggregate([
    { $match: { status: { $in: ['upcoming', 'active'] } } },
    { $group: { _id: '$driver', n: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json(users.map((u) => ({ ...u, activeRoutes: map[String(u._id)] || 0 })));
});

router.put('/:id', async (req, res) => {
  const name = str(req.body?.name).trim();
  const phone = str(req.body?.phone).trim();
  const role = str(req.body?.role);
  const password = str(req.body?.password);
  if (!name || !phone) return res.status(400).json({ message: 'Name and phone are required' });
  if (!['coordinator', 'driver'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  if (password && password.length < 6) return res.status(400).json({ message: 'New password must be 6+ characters' });
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: 'User not found' });
  if (await User.findOne({ phone, _id: { $ne: u._id } }))
    return res.status(400).json({ message: 'That phone number is used by another user' });
  if (u.role === 'coordinator' && role === 'driver' && (await coordinatorCount()) <= 1)
    return res.status(400).json({ message: 'There must be at least one coordinator' });
  u.name = name; u.phone = phone; u.role = role;
  if (password) u.password = await bcrypt.hash(password, 10);
  await u.save();
  res.json({ _id: u._id, name: u.name, phone: u.phone, role: u.role });
});

router.delete('/:id', async (req, res) => {
  if (String(req.params.id) === String(req.user._id))
    return res.status(400).json({ message: "You can't delete your own account" });
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: 'User not found' });
  if (u.role === 'coordinator' && (await coordinatorCount()) <= 1)
    return res.status(400).json({ message: 'There must be at least one coordinator' });
  const n = await Trip.countDocuments({ driver: u._id, status: { $in: ['upcoming', 'active'] } });
  if (n) return res.status(400).json({ message: `${u.name} has ${n} current route${n > 1 ? 's' : ''}. Edit or delete those routes first.` });
  await u.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
