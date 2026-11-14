const jwt = require('jsonwebtoken');
const { User } = require('./models');

exports.auth = async (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(id);
    if (!req.user) throw new Error('no user');
    next();
  } catch {
    res.status(401).json({ message: 'Please log in again' });
  }
};

exports.coordinatorOnly = (req, res, next) =>
  req.user.role === 'coordinator'
    ? next()
    : res.status(403).json({ message: 'Only the coordinator can do this' });
