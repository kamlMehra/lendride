'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getUser, fmtDate, statusText, doneCount, downloadFile } from '@/lib/api';
import { arr, normTrips, errMsg } from '@/lib/safe';
import Shell from '@/components/Shell';
import { Icon } from '@/components/Icons';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ranges = {
  month: () => { const n = new Date(); return { from: iso(new Date(n.getFullYear(), n.getMonth(), 1)), to: iso(new Date(n.getFullYear(), n.getMonth() + 1, 0)) }; },
  last: () => { const n = new Date(); return { from: iso(new Date(n.getFullYear(), n.getMonth() - 1, 1)), to: iso(new Date(n.getFullYear(), n.getMonth(), 0)) }; },
  all: () => ({ from: '', to: '' }),
};

export default function Records() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [f, setF] = useState({ driverId: '', status: '', from: '', to: '' });
  const [trips, setTrips] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Same filters are used for the list and the Excel file
  const query = () => {
    const p = new URLSearchParams();
    if (f.driverId) p.set('driverId', f.driverId);
    if (f.status) p.set('status', f.status);
    const from = f.from ? new Date(f.from + 'T00:00:00') : null;
    const to = f.to ? new Date(f.to + 'T23:59:59.999') : null;
    if (from && !isNaN(from)) p.set('from', from.toISOString());
    if (to && !isNaN(to)) p.set('to', to.toISOString());
    p.set('tz', Intl.DateTimeFormat().resolvedOptions().timeZone);
    return p.toString();
  };

  useEffect(() => {
    const u = getUser();
    if (!u) return router.replace('/login');
    if (u.role !== 'coordinator') return router.replace('/dashboard');
    setReady(true);
    api('/auth/drivers').then((d) => setDrivers(arr(d))).catch(() => {});
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    setTrips(null); setErr('');
    api('/records?' + query())
      .then((r) => setTrips(normTrips(r)))
      .catch((e) => { setErr(errMsg(e)); setTrips((t) => t ?? []); });
  }, [ready, f]);

  async function download() {
    setBusy(true); setErr('');
    try { await downloadFile('/records/export?' + query(), `seva-ride-records-${iso(new Date())}.xlsx`); }
    catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  }

  if (!ready) return null;
  const people = trips ? trips.reduce((n, t) => n + arr(t?.stops).length, 0) : 0;
  const picked = trips ? trips.reduce((n, t) => n + doneCount(t), 0) : 0;
  const active = (r) => { const x = ranges[r](); return f.from === x.from && f.to === x.to; };

  return (
    <Shell>
      <h2>Records</h2>

      <div className="field-card">
        <div className="section-title"><Icon name="search" /> Filters</div>
        <label>Driver</label>
        <select value={f.driverId} onChange={set('driverId')}>
          <option value="">All drivers</option>
          {drivers.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <label>Status</label>
        <select value={f.status} onChange={set('status')}>
          <option value="">All</option>
          <option value="upcoming">Upcoming</option>
          <option value="active">On the way</option>
          <option value="completed">Completed</option>
        </select>
        <div className="two-col">
          <div><label>From</label><input type="date" value={f.from} onChange={set('from')} /></div>
          <div><label>To</label><input type="date" value={f.to} onChange={set('to')} /></div>
        </div>
        <div className="range-row">
          <button className={`pill ${active('month') ? 'on' : ''}`} onClick={() => setF({ ...f, ...ranges.month() })}>This month</button>
          <button className={`pill ${active('last') ? 'on' : ''}`} onClick={() => setF({ ...f, ...ranges.last() })}>Last month</button>
          <button className="pill" onClick={() => setF({ driverId: '', status: '', from: '', to: '' })}>Clear all</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><b>{trips ? trips.length : '–'}</b><span>Routes</span></div>
        <div className="stat"><b>{trips ? people : '–'}</b><span>Passengers</span></div>
        <div className="stat"><b>{trips ? picked : '–'}</b><span>Picked up</span></div>
      </div>

      <button className="btn green flush" style={{ marginBottom: 16 }} onClick={download} disabled={busy || !trips || trips.length === 0}>
        <Icon name="calendar" /> {busy ? 'Preparing file…' : 'Download Excel'}
      </button>

      {err && <div className="error">{err}</div>}
      {trips === null && !err && <><div className="sk" /><div className="sk" /></>}
      {trips?.length === 0 && <div className="empty"><span className="circle"><Icon name="route" size={30} /></span><p>No records match these filters.</p></div>}
      {trips?.length >= 500 && <p className="muted" style={{ marginBottom: 10 }}>Showing the latest 500 routes. Narrow the dates to see others. The Excel file includes more.</p>}

      {trips?.map((t) => (
        <Link key={t._id} href={`/trips/${t._id}`} className={`card s-${t.status}`}>
          <div className="card-top">
            <h3>{t.title}</h3>
            <span className={`chip ${t.status}`}>{statusText(t.status)}</span>
          </div>
          <div className="meta"><Icon name="calendar" size={16} />{fmtDate(t.date)}</div>
          <div className="meta"><Icon name="user" size={16} />{t.driver?.name || 'Removed user'}</div>
          {t.car?.name && <div className="meta"><Icon name="car" size={16} />{t.car.name} {t.car.number}</div>}
          <div className="meta"><Icon name="users" size={16} />{doneCount(t)} of {arr(t.stops).length} picked up</div>
        </Link>
      ))}
    </Shell>
  );
}
