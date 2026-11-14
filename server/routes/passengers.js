const router = require('express').Router();
const { Passenger } = require('../models');
const { auth, coordinatorOnly } = require('../middleware');
const { str } = require('../util');

router.use(auth, coordinatorOnly);

const pick = (b) => ({
  name: str(b?.name).trim(),
  phone: str(b?.phone).trim(),
  address: str(b?.address).trim(),
  landmark: str(b?.landmark).trim(),
  details: str(b?.details).trim(),
});

router.get('/', async (req, res) => {
  const q = str(req.query.q).trim();
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = q ? { $or: ['name', 'phone', 'address', 'landmark'].map((k) => ({ [k]: new RegExp(safe, 'i') })) } : {};
  res.json(await Passenger.find(filter).sort('name'));
});

router.post('/', async (req, res) => {
  const data = pick(req.body);
  if (!data.name || !data.address) return res.status(400).json({ message: 'Name and address are required' });
  res.json(await Passenger.create({ ...data, createdBy: req.user._id }));
});

router.put('/:id', async (req, res) => {
  const data = pick(req.body);
  if (!data.name || !data.address) return res.status(400).json({ message: 'Name and address are required' });
  const p = await Passenger.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!p) return res.status(404).json({ message: 'Passenger not found' });
  res.json(p);
});

router.delete('/:id', async (req, res) => {
  await Passenger.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
