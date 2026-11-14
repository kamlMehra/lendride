const ExcelJS = require('exceljs');

const STATUS = { upcoming: 'Upcoming', active: 'On the way', completed: 'Completed' };

function makeFmt(tz) {
  const opts = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  let zone = tz || 'Asia/Kolkata';
  try { new Date().toLocaleString('en-IN', { timeZone: zone }); } catch { zone = 'Asia/Kolkata'; }
  return (d) => new Date(d).toLocaleString('en-IN', { ...opts, timeZone: zone });
}

function styleHeader(ws) {
  const row = ws.getRow(1);
  row.height = 22;
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B0000' } };
    c.alignment = { vertical: 'middle' };
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };
}

exports.buildWorkbook = async (trips, tz) => {
  const fmt = makeFmt(tz);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Seva Ride';

  const routes = wb.addWorksheet('Routes');
  routes.columns = [
    { header: 'Date and time', key: 'date', width: 22 },
    { header: 'Route', key: 'title', width: 28 },
    { header: 'Driver', key: 'driver', width: 22 },
    { header: 'Driver phone', key: 'dphone', width: 16 },
    { header: 'Car', key: 'car', width: 20 },
    { header: 'Car number', key: 'carno', width: 16 },
    { header: 'Lender', key: 'lender', width: 22 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Passengers', key: 'total', width: 12 },
    { header: 'Picked up', key: 'done', width: 12 },
  ];

  const pax = wb.addWorksheet('Passengers');
  pax.columns = [
    { header: 'Date and time', key: 'date', width: 22 },
    { header: 'Route', key: 'title', width: 28 },
    { header: 'Driver', key: 'driver', width: 22 },
    { header: 'Order', key: 'order', width: 8 },
    { header: 'Passenger', key: 'name', width: 24 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Pick up from', key: 'from', width: 34 },
    { header: 'Drop at', key: 'drop', width: 30 },
    { header: 'Note', key: 'note', width: 30 },
    { header: 'Picked up', key: 'done', width: 12 },
  ];

  for (const raw of Array.isArray(trips) ? trips : []) {
    if (!raw) continue;
    const t = { ...(raw.toObject ? raw.toObject() : raw), stops: Array.isArray(raw.stops) ? raw.stops.filter(Boolean) : [] };
    const driver = t.driver ? t.driver.name || '' : 'Removed user';
    const date = fmt(t.date);
    routes.addRow({
      date, title: t.title, driver, dphone: t.driver ? t.driver.phone : '',
      car: t.car?.name || '', carno: t.car?.number || '',
      lender: t.lender?.name ? `${t.lender.name}${t.lender.phone ? ' (' + t.lender.phone + ')' : ''}` : '',
      status: STATUS[t.status] || t.status,
      total: t.stops.length, done: t.stops.filter((s) => s.done).length,
    });
    t.stops.forEach((s, i) =>
      pax.addRow({
        date, title: t.title, driver, order: i + 1, name: s.personName, phone: s.personPhone || '',
        from: s.pickupFrom || '', drop: s.dropAt || '', note: s.note || '', done: s.done ? 'Yes' : 'No',
      })
    );
  }
  styleHeader(routes);
  styleHeader(pax);
  return wb;
};
