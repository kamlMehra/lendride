const router = require('express').Router();
const { Trip, User } = require('../models');
const { str } = require('../util');
const { auth, coordinatorOnly } = require('../middleware');
const live = require('../live');

router.use(auth);

const isCoord = (u) => u.role === 'coordinator';
const idOf = (d) => String(d && d._id ? d._id : d);
const cleanCar = (c) => ({ name: str(c?.name).trim(), number: str(c?.number).trim() });
const cleanPerson = (p) => ({ name: str(p?.name).trim(), phone: str(p?.phone).trim() });

// ---- Live updates ----
// A coordinator's change is sent only to that route's driver.
// A driver's progress is sent to the coordinators.
const tellDriver = (driver, tripId, msg) => live.toUser(idOf(driver), { type: 'trips', tripId: String(tripId), msg });
const tellCoordinators = (req, tripId, msg) =>
  live.toRole('coordinator', { type: 'trips', tripId: String(tripId), msg }, req.user._id);
const changed = (req, trip, driverMsg, coordMsg) => {
  if (isCoord(req.user)) {
    tellDriver(trip.driver, trip._id, driverMsg);
    tellCoordinators(req, trip._id); // other coordinators refresh silently
  } else tellCoordinators(req, trip._id, coordMsg);
};

// Load a trip and make sure this user may see it (drivers: only their own)
async function loadTrip(req, res, next) {
  const trip = await Trip.findById(req.params.id).populate('driver', 'name phone');
  if (!trip) return res.status(404).json({ message: 'Route not found' });
  if (!isCoord(req.user) && String(trip.driver?._id) !== String(req.user._id))
    return res.status(403).json({ message: 'This route is not assigned to you' });
  req.trip = trip;
  next();
}

// List: ?view=current | previous
router.get('/', async (req, res) => {
  const filter = isCoord(req.user) ? {} : { driver: req.user._id };
  filter.status = req.query.view === 'previous' ? 'completed' : { $in: ['upcoming', 'active'] };
  const sort = req.query.view === 'previous' ? '-date' : 'date';
  res.json(await Trip.find(filter).populate('driver', 'name phone').sort(sort));
});

router.post('/', coordinatorOnly, async (req, res) => {
  const { car, lender, stops } = req.body || {};
  const title = str(req.body?.title).trim();
  const date = str(req.body?.date).trim();
  const driverId = str(req.body?.driverId).trim();
  if (!title || !date || !driverId || isNaN(new Date(date)))
    return res.status(400).json({ message: 'Title, date and driver are required' });
  if (!(await User.exists({ _id: driverId }))) return res.status(400).json({ message: 'Driver not found' });
  const hasLender = lender && typeof lender === 'object' && (lender.name || lender.phone);
  // Passengers can be added while creating the route (kept in the order sent)
  const cleanStops = (Array.isArray(stops) ? stops : [])
    .map((x) => ({ personName: str(x?.personName).trim(), personPhone: str(x?.personPhone).trim(), pickupFrom: str(x?.pickupFrom).trim(), dropAt: str(x?.dropAt).trim(), note: str(x?.note).trim() }))
    .filter((x) => x.personName && x.pickupFrom);
  const trip = await Trip.create({
    title, date, driver: driverId, car: cleanCar(car),
    lender: hasLender ? cleanPerson(lender) : undefined,
    stops: cleanStops,
    createdBy: req.user._id,
  });
  tellDriver(driverId, trip._id, 'A new route was assigned to you');
  tellCoordinators(req, trip._id);
  res.json(trip);
});

router.get('/:id', loadTrip, (req, res) => res.json(req.trip));

// Edit route details (name, date, driver, car, lender). Passengers are edited on the route page.
router.put('/:id', coordinatorOnly, async (req, res) => {
  const { car, lender } = req.body || {};
  const title = str(req.body?.title).trim();
  const date = str(req.body?.date).trim();
  const driverId = str(req.body?.driverId).trim();
  if (!title || !date || !driverId || isNaN(new Date(date)))
    return res.status(400).json({ message: 'Title, date and driver are required' });
  if (!(await User.exists({ _id: driverId }))) return res.status(400).json({ message: 'Driver not found' });
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.status(404).json({ message: 'Route not found' });
  const oldDriver = idOf(trip.driver);
  trip.title = title;
  trip.date = date;
  trip.driver = driverId;
  trip.car = cleanCar(car);
  trip.lender = lender && typeof lender === 'object' && (lender.name || lender.phone) ? cleanPerson(lender) : undefined;
  await trip.save();
  if (oldDriver !== String(driverId)) {
    tellDriver(oldDriver, trip._id, 'A route was removed from your list');
    tellDriver(driverId, trip._id, 'A new route was assigned to you');
  } else tellDriver(driverId, trip._id, `Your route "${trip.title}" was updated`);
  tellCoordinators(req, trip._id);
  res.json(await trip.populate('driver', 'name phone'));
});

router.delete('/:id', coordinatorOnly, async (req, res) => {
  const trip = await Trip.findByIdAndDelete(req.params.id);
  if (trip) {
    tellDriver(trip.driver, trip._id, 'A route was removed from your list');
    tellCoordinators(req, trip._id);
  }
  res.json({ ok: true });
});

// Add a new person to the route
router.post('/:id/stops', coordinatorOnly, loadTrip, async (req, res) => {
  const personName = str(req.body?.personName).trim();
  const personPhone = str(req.body?.personPhone).trim();
  const pickupFrom = str(req.body?.pickupFrom).trim();
  const dropAt = str(req.body?.dropAt).trim();
  const note = str(req.body?.note).trim();
  if (!personName || !pickupFrom) return res.status(400).json({ message: 'Enter the person and the pickup location' });
  req.trip.stops.push({ personName, personPhone, pickupFrom, dropAt, note });
  await req.trip.save();
  changed(req, req.trip, `${personName} was added to "${req.trip.title}"`);
  res.json(req.trip);
});

router.delete('/:id/stops/:stopId', coordinatorOnly, loadTrip, async (req, res) => {
  req.trip.stops.pull(req.params.stopId);
  await req.trip.save();
  changed(req, req.trip, `A passenger was removed from "${req.trip.title}"`);
  res.json(req.trip);
});

// Driver (or coordinator) marks a person as picked up
router.patch('/:id/stops/:stopId/done', loadTrip, async (req, res) => {
  const stop = req.trip.stops.id(req.params.stopId);
  if (!stop) return res.status(404).json({ message: 'Stop not found' });
  stop.done = !stop.done;
  await req.trip.save();
  changed(req, req.trip, `Your route "${req.trip.title}" was updated`,
    `${req.user.name}: ${stop.personName} ${stop.done ? 'picked up' : 'marked not picked up'}`);
  res.json(req.trip);
});

router.patch('/:id/status', loadTrip, async (req, res) => {
  if (!['upcoming', 'active', 'completed'].includes(req.body?.status))
    return res.status(400).json({ message: 'Invalid status' });
  req.trip.status = req.body.status;
  await req.trip.save();
  const word = { upcoming: 'is upcoming again', active: 'has started', completed: 'is completed' }[req.body.status];
  changed(req, req.trip, `Your route "${req.trip.title}" ${word}`, `${req.user.name}: "${req.trip.title}" ${word}`);
  res.json(req.trip);
});

module.exports = router;
