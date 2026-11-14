'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { arr, str, errMsg } from '@/lib/safe';
import Shell from '@/components/Shell';
import { Icon } from '@/components/Icons';

// Convert a stored date to the value a datetime-local input expects (local time)
const toLocalInput = (d) => {
  const x = new Date(d);
  if (!d || isNaN(x)) return '';
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function EditTrip() {
  const params = useParams();
  const id = str(params?.id);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [useLender, setUseLender] = useState(false);
  const [f, setF] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const u = getUser();
    if (!u) return router.replace('/login');
    if (u.role !== 'coordinator') return router.replace('/dashboard');
    setReady(true);
    Promise.all([api('/trips/' + id), api('/auth/drivers')])
      .then(([t, d]) => {
        if (!t || typeof t !== 'object') throw new Error('Route not found');
        setDrivers(arr(d));
        setUseLender(!!(t.lender?.name || t.lender?.phone));
        setF({
          title: str(t.title), date: toLocalInput(t.date), driverId: str(t.driver?._id),
          carName: str(t.car?.name), carNumber: str(t.car?.number),
          lenderName: str(t.lender?.name), lenderPhone: str(t.lender?.phone),
        });
      })
      .catch((e) => setErr(errMsg(e)));
  }, [id, router]);

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      await api('/trips/' + id, {
        method: 'PUT',
        body: {
          title: f.title, date: f.date, driverId: f.driverId,
          car: { name: f.carName, number: f.carNumber },
          lender: useLender ? { name: f.lenderName, phone: f.lenderPhone } : undefined,
        },
      });
      router.push(`/trips/${id}`);
    } catch (e) { setErr(errMsg(e)); setBusy(false); }
  }

  if (!ready) return null;
  return (
    <Shell>
      <h2>Edit route</h2>
      {err && <div className="error">{err}</div>}
      {!f && !err && <><div className="sk" /><div className="sk" /></>}
      {f && (
        <form onSubmit={submit}>
          <div className="field-card">
            <div className="section-title"><Icon name="route" /> Route</div>
            <label>Route name</label>
            <input value={f.title} onChange={set('title')} required />
            <label>Date and time</label>
            <input type="datetime-local" value={f.date} onChange={set('date')} required />
            <label>Driver</label>
            <select value={f.driverId} onChange={set('driverId')} required>
              <option value="">Choose a driver</option>
              {drivers.map((d) => <option key={d?._id} value={d?._id}>{str(d?.name)} ({str(d?.phone)})</option>)}
            </select>
          </div>

          <div className="field-card">
            <div className="section-title"><Icon name="car" /> Car</div>
            <label>Car name</label>
            <input value={f.carName} onChange={set('carName')} />
            <label>Car number</label>
            <input value={f.carNumber} onChange={set('carNumber')} />
            <label className="toggle-row">
              <span>This car has a lender <span className="muted">(optional)</span></span>
              <input type="checkbox" checked={useLender} onChange={(e) => setUseLender(e.target.checked)} />
            </label>
            {useLender && (
              <>
                <label>Lender name</label>
                <input value={f.lenderName} onChange={set('lenderName')} />
                <label>Lender phone</label>
                <input type="tel" inputMode="tel" value={f.lenderPhone} onChange={set('lenderPhone')} />
              </>
            )}
          </div>

          <p className="muted">To change the passengers, open the route and use Add or Remove on each stop.</p>
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          <button type="button" className="btn ghost" onClick={() => router.push(`/trips/${id}`)}>Cancel</button>
        </form>
      )}
    </Shell>
  );
}
