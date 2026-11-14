'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, getUser, fmtDate, mapsUrl, statusText, doneCount, telHref } from '@/lib/api';
import { arr, str, normTrip, errMsg } from '@/lib/safe';
import { useLive } from '@/lib/live';
import Shell from '@/components/Shell';
import { Icon, Avatar } from '@/components/Icons';

const empty = { personName: '', personPhone: '', pickupFrom: '', dropAt: '', note: '' };

export default function TripPage() {
  const params = useParams();
  const id = str(params?.id);
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [trip, setTrip] = useState(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState([]);
  const [toast, setToast] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const reload = () =>
    api('/trips/' + id)
      .then((t) => { const n = normTrip(t); if (!n) throw new Error('Route not found'); setTrip(n); setErr(''); })
      .catch((e) => { setTrip(null); setErr(errMsg(e)); });

  useEffect(() => {
    const u = getUser();
    if (!u) return router.replace('/login');
    setUser(u);
    reload();
    if (u.role === 'coordinator') api('/passengers').then((d) => setSaved(arr(d))).catch(() => {});
  }, [id, router]);

  // Live: refresh by itself when this route is changed
  useLive((m) => {
    if (m?.type === 'resync' || (m?.type === 'trips' && (!m?.tripId || m?.tripId === id))) {
      reload();
      if (m?.type === 'trips' && m?.msg) { setToast(m?.msg); setTimeout(() => setToast(''), 4000); }
    }
  });

  const run = async (path, method = 'POST', body) => {
    setErr('');
    try { const n = normTrip(await api(`/trips/${id}${path}`, { method, body })); if (n) setTrip(n); return true; }
    catch (e) { setErr(errMsg(e)); return false; }
  };

  async function addStop(e) {
    e.preventDefault();
    if (await run('/stops', 'POST', f)) { setF(empty); setAdding(false); }
  }

  async function removeTrip() {
    if (!confirm(`Delete "${str(trip?.title)}"? This cannot be undone.`)) return;
    await api('/trips/' + id, { method: 'DELETE' });
    router.push('/dashboard');
  }

  if (!user) return null;
  const coord = user.role === 'coordinator';
  const open = trip && trip.status !== 'completed';
  const done = trip ? doneCount(trip) : 0;
  const total = arr(trip?.stops).length;
  const next = trip && trip.status !== 'completed' ? arr(trip.stops).find((x) => x && !x.done) : null;

  return (
    <Shell>
      {toast && <div className="toast" role="status">{toast}</div>}
      {err && <div className="error">{err}</div>}
      {!trip && !err && <><div className="sk" /><div className="sk" /></>}
      {trip && (
        <>
          <div className={`card s-${trip.status}`}>
            <div className="card-top">
              <h3 style={{ fontSize: '1.25rem' }}>{trip.title}</h3>
              <span className={`chip ${trip.status}`}>{statusText(trip.status)}</span>
            </div>
            <div className="meta"><Icon name="calendar" size={16} />{fmtDate(trip.date)}</div>
            {trip.car?.name && <div className="meta"><Icon name="car" size={16} />{trip.car.name} {trip.car.number}</div>}
            <div className="driver-line"><Avatar name={trip.driver?.name || '?'} /><span>Driver: <b>{trip.driver?.name || 'Removed user'}</b></span></div>
            {trip.lender?.name && (
              <div className="meta"><Icon name="user" size={16} />
                <span>Lender: {trip.lender.name} {trip.lender.phone && <a href={telHref(trip.lender.phone)}>{trip.lender.phone}</a>}</span>
              </div>
            )}
            {total > 0 && (
              <>
                <div className="progress"><span style={{ width: `${(done / total) * 100}%` }} /></div>
                <div className="progress-label"><span>{done} of {total} picked up</span></div>
              </>
            )}
            {coord && (
              <div className="actions">
                <Link href={`/trips/${id}/edit`} className="pill"><Icon name="edit" size={16} /> Edit route</Link>
                <button className="pill danger" onClick={removeTrip}><Icon name="trash" size={16} /> Delete route</button>
              </div>
            )}
          </div>

          {next && (
            <div className="next-card">
              <div className="next-label">Next pickup</div>
              <div className="stop-name" style={{ fontSize: '1.2rem' }}>{next.personName}</div>
              <div className="meta"><Icon name="pin" size={16} /><span>{next.pickupFrom}</span></div>
              {next.personPhone ? (
                <a className="btn green" href={telHref(next.personPhone)}><Icon name="phone" /> Call {str(next.personName).split(' ')[0] || 'passenger'}</a>
              ) : (
                <p className="muted" style={{ marginTop: 10 }}>No phone number saved for this person.</p>
              )}
              <a className="btn ghost" href={mapsUrl(next.pickupFrom)} target="_blank" rel="noreferrer"><Icon name="navigate" /> Navigate</a>
              <button className="btn" onClick={() => run(`/stops/${next._id}/done`, 'PATCH')}><Icon name="check" /> Picked up</button>
            </div>
          )}

          <h2>Route</h2>
          {total === 0 && (
            <div className="empty"><span className="circle"><Icon name="users" size={30} /></span><p>No one added yet.</p></div>
          )}
          <ol className="timeline">
            {arr(trip.stops).map((s, i) => (
              <li key={s._id} className={`tl ${s.done ? 'done' : ''}`} style={{ animationDelay: `${i * 50}ms` }}>
                <span className="tl-num">{s.done ? <Icon name="check" size={18} /> : i + 1}</span>
                <div className="stop-card">
                  <div className="stop-name">{s.personName}</div>
                  <div className="meta"><Icon name="pin" size={16} /><span>Pick up from: {s.pickupFrom}</span></div>
                  {s.dropAt && <div className="meta"><Icon name="navigate" size={16} /><span>Drop at: {s.dropAt}</span></div>}
                  {s.note && <p className="muted" style={{ marginTop: 6 }}>{s.note}</p>}
                  <div className="actions">
                    {!s.personPhone && <span className="muted">No phone number</span>}
                    {s.personPhone && <a className="pill call" href={telHref(s.personPhone)}><Icon name="phone" size={16} /> Call</a>}
                    <a className="pill go" href={mapsUrl(s.pickupFrom)} target="_blank" rel="noreferrer"><Icon name="navigate" size={16} /> Navigate</a>
                    {open && (
                      <button className={`pill ${s.done ? '' : 'done'}`} onClick={() => run(`/stops/${s._id}/done`, 'PATCH')}>
                        <Icon name="check" size={16} /> {s.done ? 'Undo' : 'Picked up'}
                      </button>
                    )}
                    {coord && open && (
                      <button className="pill danger" onClick={() => run(`/stops/${s._id}`, 'DELETE')}><Icon name="trash" size={16} /> Remove</button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {coord && open && (
            adding ? (
              <form onSubmit={addStop} className="field-card">
                <div className="section-title"><Icon name="plus" /> Add person to route</div>
                {saved.length > 0 && (
                  <>
                    <label>Choose from saved passengers</label>
                    <select
                      value=""
                      onChange={(e) => {
                        const p = saved.find((x) => x?._id === e.target.value);
                        if (p) setF({ personName: str(p.name), personPhone: str(p.phone), pickupFrom: str(p.address), dropAt: '', note: str(p.details) });
                      }}
                    >
                      <option value="">Select a passenger</option>
                      {saved.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                  </>
                )}
                <label>Person to pick up</label>
                <input value={f.personName} onChange={set('personName')} required />
                <label>Phone (optional)</label>
                <input type="tel" inputMode="tel" value={f.personPhone} onChange={set('personPhone')} />
                <label>Pick up from</label>
                <input value={f.pickupFrom} onChange={set('pickupFrom')} required />
                <label>Drop at (optional)</label>
                <input value={f.dropAt} onChange={set('dropAt')} />
                <label>Note (optional)</label>
                <input value={f.note} onChange={set('note')} />
                <button className="btn">Add to route</button>
                <button type="button" className="btn ghost" onClick={() => setAdding(false)}>Cancel</button>
              </form>
            ) : (
              <button className="btn ghost" onClick={() => setAdding(true)}><Icon name="plus" /> Add person to route</button>
            )
          )}

          {trip.status === 'upcoming' && <button className="btn" onClick={() => run('/status', 'PATCH', { status: 'active' })}><Icon name="navigate" /> Start trip</button>}
          {trip.status === 'active' && <button className="btn green" onClick={() => run('/status', 'PATCH', { status: 'completed' })}><Icon name="check" /> Complete trip</button>}
        </>
      )}
    </Shell>
  );
}
