// Keeps one open stream per logged-in device and pushes small "something changed" messages.
const conns = new Map(); // userId -> Set of { res, role, userId }

exports.add = (user, res) => {
  const c = { res, role: user.role, userId: String(user._id) };
  if (!conns.has(c.userId)) conns.set(c.userId, new Set());
  conns.get(c.userId).add(c);
  return () => {
    const set = conns.get(c.userId);
    if (set) { set.delete(c); if (!set.size) conns.delete(c.userId); }
  };
};

const send = (c, payload) => {
  try { c.res.write('data: ' + JSON.stringify(payload) + '\n\n'); } catch { /* connection already closed */ }
};

// Only this one person's devices
exports.toUser = (userId, payload) => {
  for (const c of conns.get(String(userId)) || []) send(c, payload);
};

// Everyone with this role, except the person who made the change
exports.toRole = (role, payload, exceptUserId) => {
  for (const set of conns.values())
    for (const c of set) if (c.role === role && c.userId !== String(exceptUserId)) send(c, payload);
};
