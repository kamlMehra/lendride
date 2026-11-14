'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser } from '@/lib/api';
import { arr, str, errMsg } from '@/lib/safe';
import Shell from '@/components/Shell';
import { Icon } from '@/components/Icons';

const emptyStop = { personName: '', personPhone: '', pickupFrom: '', dropAt: '', note: '' };

export default function NewTrip() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [saved, setSaved] = useState([]);
  const [useLender, setUseLender] = useState(false);
  const [f, setF] = useState({ title: '', date: '', driverId: '', carName: '', carNumber: '', lenderName: '', lenderPhone: '' });
  const [stops, setStops] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [ns, setNs] = useState(emptyStop);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setN = (k) => (e) => setNs({ ...ns, [k]: e.target.value });

  useEffect(() => {
    const u = getUser();
    if (!u) return router.replace('/login');
    if (u.role !== 'coordinator') return router.replace('/dashboard');
    setReady(true);
    api('/auth/drivers').then((d) => setDrivers(arr(d))).catch((e) => setErr(errMsg(e)));
    api('/passengers').then((d) => setSaved(arr(d))).catch(() => {});
  }, [router]);

  const addSaved = (id) => {
    const p = saved.find((x) => x?._id === id);
    if (!p || stops.some((s) => s.pid === p._id)) return;
    setStops([...stops, { key: p._id, pid: p._id, personName: str(p.name), personPhone: str(p.phone), pickupFrom: str(p.address), dropAt: '', note: str(p.details) }]);
  };

  const addNew = () => {
    if (!str(ns.personName).trim() || !str(ns.pickupFrom).trim()) return setErr('Enter the person\'s name and pickup location');
    setErr('');
    setStops([...stops, { ...ns, key: String(Math.random()) }]);
    setNs(emptyStop); setShowNew(false);
  };

  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= stops.length) return;
    const a = [...stops];
    [a[i], a[j]] = [a[j], a[i]];
    setStops(a);
  };

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const trip = await api('/trips', {
        method: 'POST',
        body: {
          title: f.title, date: f.date, driverId: f.driverId,
          car: { name: f.carName, number: f.carNumber },
          lender: useLender ? { name: f.lenderName, phone: f.lenderPhone } : undefined,
          stops: stops.map(({ personName, personPhone, pickupFrom, dropAt, note }) => ({ personName, personPhone, pickupFrom, dropAt, note })),
        },
      });
      router.push(`/trips/${trip._id}`);
    } catch (e) { setErr(errMsg(e)); setBusy(false); }
  }

  if (!ready) return null;
  return (
    <Shell>
      <h2>New route</h2>
      <form onSubmit={submit}>
        <div className="field-card">
          <div className="section-title"><Icon name="route" /> Route</div>
          <label>Route name</label>
          <input value={f.title} onChange={set('title')} placeholder="e.g. Sunday morning pickup" required />
          <label>Date and time</label>
          <input type="datetime-local" value={f.date} onChange={set('date')} required />
          <label>Driver</label>
          <select value={f.driverId} onChange={set('driverId')} required>
            <option value="">Choose a driver</option>
            {drivers.map((d) => <option key={d._id} value={d._id}>{d.name} ({d.phone})</option>)}
          </select>
        </div>

        <div className="field-card">
          <div className="section-title"><Icon name="car" /> Car</div>
          <label>Car name</label>
          <input value={f.carName} onChange={set('carName')} placeholder="e.g. White Innova" />
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

        <div className="field-card">
          <div className="section-title"><Icon name="users" /> Passengers <span className="muted">(optional)</span></div>
          <p className="muted" style={{ marginTop: 4 }}>Add the people this driver will pick up, in order. You can add more later.</p>

          {stops.length > 0 && (
            <ol className="timeline" style={{ marginTop: 14 }}>
              {stops.map((s, i) => (
                <li key={s.key} className="tl">
                  <span className="tl-num">{i + 1}</span>
                  <div className="stop-card">
                    <div className="stop-name">{s.personName}</div>
                    <div className="meta"><Icon name="pin" size={16} /><span>{s.pickupFrom}</span></div>
                    {s.personPhone && <div className="meta"><Icon name="phone" size={16} /><span>{s.personPhone}</span></div>}
                    <div className="actions">
                      <button type="button" className="pill" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑ Up</button>
                      <button type="button" className="pill" onClick={() => move(i, 1)} disabled={i === stops.length - 1} aria-label="Move down">↓ Down</button>
                      <button type="button" className="pill danger" onClick={() => setStops(stops.filter((x) => x.key !== s.key))}><Icon name="trash" size={16} /> Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {saved.length > 0 && (
            <>
              <label>Add from saved passengers</label>
              <select value="" onChange={(e) => addSaved(e.target.value)}>
                <option value="">Select a passenger</option>
                {saved.filter((p) => !stops.some((s) => s.pid === p._id)).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </>
          )}

          {showNew ? (
            <div style={{ marginTop: 6 }}>
              <label>Person to pick up</label>
              <input value={ns.personName} onChange={setN('personName')} />
              <label>Phone (optional)</label>
              <input type="tel" inputMode="tel" value={ns.personPhone} onChange={setN('personPhone')} />
              <label>Pick up from</label>
              <input value={ns.pickupFrom} onChange={setN('pickupFrom')} />
              <label>Drop at (optional)</label>
              <input value={ns.dropAt} onChange={setN('dropAt')} />
              <label>Note (optional)</label>
              <input value={ns.note} onChange={setN('note')} />
              <button type="button" className="btn" onClick={addNew}>Add to route</button>
              <button type="button" className="btn ghost" onClick={() => { setShowNew(false); setNs(emptyStop); setErr(''); }}>Cancel</button>
            </div>
          ) : (
            <button type="button" className="btn ghost" onClick={() => setShowNew(true)}><Icon name="plus" /> Add new person</button>
          )}
        </div>

        {err && <div className="error">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : `Create route${stops.length ? ` with ${stops.length} ${stops.length === 1 ? 'person' : 'people'}` : ''}`}</button>
      </form>
    </Shell>
  );
}
