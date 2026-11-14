'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getUser, fmtDate, statusText, doneCount } from '@/lib/api';
import { arr, normTrips, errMsg } from '@/lib/safe';
import { useLive } from '@/lib/live';
import Shell from '@/components/Shell';
import { Icon, Avatar } from '@/components/Icons';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [view, setView] = useState('current');
  const [data, setData] = useState({ current: null, previous: null });
  const [err, setErr] = useState('');

  const [toast, setToast] = useState('');

  const load = () =>
    Promise.all([api('/trips?view=current'), api('/trips?view=previous')])
      .then(([current, previous]) => { setData({ current: normTrips(current), previous: normTrips(previous) }); setErr(''); })
      .catch((e) => { setErr(errMsg(e)); setData((d) => ({ current: d.current ?? [], previous: d.previous ?? [] })); });

  useEffect(() => {
    const u = getUser();
    if (!u) return router.replace('/login');
    setUser(u);
    load();
  }, [router]);

  // Live: refresh by itself when the coordinator adds, edits or removes a route
  useLive((m) => {
    if (m?.type !== 'trips' && m?.type !== 'resync') return;
    load();
    if (m?.msg) { setToast(m?.msg); setTimeout(() => setToast(''), 4000); }
  });

  async function removeTrip(t) {
    if (!confirm(`Delete "${t.title}"? This cannot be undone.`)) return;
    try {
      await api('/trips/' + t._id, { method: 'DELETE' });
      setData((d) => ({
        current: d.current ? d.current.filter((x) => x._id !== t._id) : null,
        previous: d.previous ? d.previous.filter((x) => x._id !== t._id) : null,
      }));
    } catch (e) { setErr(errMsg(e)); }
  }

  if (!user) return null;
  const coord = user.role === 'coordinator';
  const cur = data.current || [];
  const list = data[view];
  const stats = [
    { n: cur.filter((t) => t.status === 'upcoming').length, l: 'Upcoming' },
    { n: cur.filter((t) => t.status === 'active').length, l: 'On the way' },
    { n: cur.reduce((n, t) => n + arr(t?.stops).filter((s) => !s?.done).length, 0), l: 'To pick up' },
  ];

  return (
    <Shell>
      {toast && <div className="toast" role="status">{toast}</div>}
      <div className="note">
        <b>Hello, {user.name}</b>
        {coord ? 'Create routes and add people to pick up.' : 'Your assigned routes appear here.'}
      </div>

      <div className="stats">
        {stats.map((s) => <div key={s.l} className="stat"><b>{data.current ? s.n : '–'}</b><span>{s.l}</span></div>)}
      </div>

      <div className="tabs">
        <button className={view === 'current' ? 'on' : ''} onClick={() => setView('current')}>Current</button>
        <button className={view === 'previous' ? 'on' : ''} onClick={() => setView('previous')}>Previous</button>
      </div>

      {err && <div className="error">{err}</div>}
      {list === null && !err && <><div className="sk" /><div className="sk" /></>}
      {list?.length === 0 && (
        <div className="empty">
          <span className="circle"><Icon name="route" size={30} /></span>
          <p>{view === 'current' ? 'No current routes.' : 'No completed routes yet.'}</p>
          {coord && view === 'current' && <Link href="/trips/new" className="btn" style={{ maxWidth: 240, margin: '14px auto 0' }}><Icon name="plus" /> New route</Link>}
        </div>
      )}
      {list?.map((t, i) => {
        const done = doneCount(t), total = arr(t.stops).length;
        return (
          <div key={t._id} style={{ marginBottom: 12 }}>
          <Link href={`/trips/${t._id}`} className={`card s-${t.status}`} style={{ animationDelay: `${i * 50}ms`, marginBottom: 0 }}>
            <div className="card-top">
              <h3>{t.title}</h3>
              <span className={`chip ${t.status}`}>{statusText(t.status)}</span>
            </div>
            <div className="meta"><Icon name="calendar" size={16} />{fmtDate(t.date)}</div>
            {t.car?.name && <div className="meta"><Icon name="car" size={16} />{t.car.name} {t.car.number}</div>}
            {coord && <div className="driver-line"><Avatar name={t.driver?.name || '?'} /><span>{t.driver?.name || 'Removed user'}</span></div>}
            {total > 0 && (
              <>
                <div className="progress"><span style={{ width: `${(done / total) * 100}%` }} /></div>
                <div className="progress-label"><span>{done} of {total} picked up</span><span>{total} {total === 1 ? 'person' : 'people'}</span></div>
              </>
            )}
            {total === 0 && <p className="muted" style={{ marginTop: 10 }}>No one added yet</p>}
          </Link>
          {coord && (
            <div className="actions" style={{ marginTop: 8 }}>
              <Link href={`/trips/${t._id}/edit`} className="pill"><Icon name="edit" size={16} /> Edit</Link>
              <button className="pill danger" onClick={() => removeTrip(t)}><Icon name="trash" size={16} /> Delete</button>
            </div>
          )}
          </div>
        );
      })}
    </Shell>
  );
}
