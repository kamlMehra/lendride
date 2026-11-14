const router = require('express').Router();
const { Trip } = require('../models');
const { auth, coordinatorOnly } = require('../middleware');
const { buildWorkbook } = require('../excel');
const { str } = require('../util');

router.use(auth, coordinatorOnly);

// Filters: driverId, status, from, to (ISO dates)
function filterFrom(q) {
  const f = {};
  if (str(q.driverId)) f.driver = str(q.driverId);
  if (['upcoming', 'active', 'completed'].includes(q.status)) f.status = q.status;
  const d = {};
  if (str(q.from) && !isNaN(new Date(str(q.from)))) d.$gte = new Date(str(q.from));
  if (str(q.to) && !isNaN(new Date(str(q.to)))) d.$lte = new Date(str(q.to));
  if (Object.keys(d).length) f.date = d;
  return f;
}

router.get('/', async (req, res) => {
  res.json(await Trip.find(filterFrom(req.query)).populate('driver', 'name phone').sort('-date').limit(500));
});

router.get('/export', async (req, res) => {
  const trips = await Trip.find(filterFrom(req.query)).populate('driver', 'name phone').sort('-date').limit(5000);
  const wb = await buildWorkbook(trips, str(req.query.tz));
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="seva-ride-records.xlsx"',
  });
  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;
