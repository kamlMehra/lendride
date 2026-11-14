const router = require('express').Router();
const { auth } = require('../middleware');
const live = require('../live');

router.get('/', auth, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  const remove = live.add(req.user, res);
  const beat = setInterval(() => res.write(': ping\n\n'), 25000); // keeps proxies from closing the stream
  req.on('close', () => { clearInterval(beat); remove(); });
});

module.exports = router;
