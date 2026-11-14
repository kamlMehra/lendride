const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { auth, coordinatorOnly } = require('../middleware');
const { str } = require('../util');

const sign = (u) => ({
  token: jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '30d' }),
  user: { id: u._id, name: u.name, phone: u.phone, role: u.role },
});

router.post('/register', async (req, res) => {
  const name = str(req.body?.name).trim();
  const phone = str(req.body?.phone).trim();
  const password = str(req.body?.password);
  const code = str(req.body?.code).trim();
  if (!name || !phone || password.length < 6)
    return res.status(400).json({ message: 'Enter name, phone and a password of 6+ characters' });
  if (await User.findOne({ phone })) return res.status(400).json({ message: 'This phone number is already registered' });
  const role = code && code === process.env.COORDINATOR_CODE ? 'coordinator' : 'driver';
  const u = await User.create({ name, phone, password: await bcrypt.hash(password, 10), role });
  res.json(sign(u));
});

router.post('/login', async (req, res) => {
  const phone = str(req.body?.phone).trim();
  const password = str(req.body?.password);
  const u = phone ? await User.findOne({ phone }) : null;
  if (!u || !(await bcrypt.compare(password, u.password)))
    return res.status(400).json({ message: 'Wrong phone number or password' });
  res.json(sign(u));
});

// Coordinator picks a driver from this list
router.get('/drivers', auth, coordinatorOnly, async (req, res) => {
  res.json(await User.find({ role: 'driver' }).select('name phone').sort('name'));
});

module.exports = router;
