'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, mapsUrl, telHref } from '@/lib/api';
import { arr, str, normTrips, errMsg } from '@/lib/safe';
import Shell from '@/components/Shell';
import { Icon, Avatar } from '@/components/Icons';

const empty = { name: '', phone: '', address: '', landmark: '', details: '' };

export default function Passengers() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [list, setList] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [q, setQ] = useState('');
  const [f, setF] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const load = (search = '') =>
    api('/passengers?q=' + encodeURIComponent(str(search)))
      .then((d) => setList(arr(d)))
      .catch((e) => { setErr(errMsg(e)); setList((l) => l ?? []); });

  useEffect(() => {
    const u = getUser();
    if (!u) return router.replace('/login');
    if (u.role !== 'coordinator') return router.replace('/dashboard');
    setReady(true);
    api('/trips?view=current').then((r) => setRoutes(normTrips(r))).catch(() => {});
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, ready]);

  async function save(e) {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      await api(editId ? '/passengers/' + editId : '/passengers', { method: editId ? 'PUT' : 'POST', body: f });
      setF(empty); setEditId(null); setShowForm(false);
      load(q);
    } catch (e) { setErr(errMsg(e)); }
  }

  function edit(p) {
    setF({ name: str(p.name), phone: str(p.phone), address: str(p.address), landmark: str(p.landmark), details: str(p.details) });
    setEditId(p._id); setShowForm(true); setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(p) {
    if (!confirm(`Delete ${p.name}?`)) return;
    await api('/passengers/' + p._id, { method: 'DELETE' });
    load(q);
  }

  async function addToRoute(p, tripId) {
    if (!tripId) return;
    setErr(''); setMsg('');
    try {
      await api(`/trips/${tripId}/stops`, {
        method: 'POST',
        body: { personName: p.name, personPhone: p.phone, pickupFrom: p.address, note: p.details },
      });
      const r = routes.find((x) => x?._id === tripId);
      setMsg(`${p.name} added to "${r?.title}"`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setErr(errMsg(e)); }
  }

  if (!ready) return null;

  return (
    <Shell>
      <h2>Passengers</h2>
      {msg && <div className="note" style={{ color: 'var(--green)', background: 'var(--green-soft)', borderColor: '#b8d9bd' }}><Icon name="check" size={16} /> {msg}</div>}
      {err && <div className="error">{err}</div>}

      {showForm ? (
        <form onSubmit={save} className="field-card">
          <div className="section-title"><Icon name={editId ? 'edit' : 'plus'} /> {editId ? 'Edit passenger' : 'New passenger'}</div>
          <label>Name</label>
          <input value={f.name} onChange={set('name')} required />
          <label>Phone number</label>
          <input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} />
          <label>Address</label>
          <input value={f.address} onChange={set('address')} required />
          <label>Landmark (optional)</label>
          <input value={f.landmark} onChange={set('landmark')} />
          <label>Other details (optional)</label>
          <textarea rows={3} value={f.details} onChange={set('details')} placeholder="e.g. 2 people, needs front seat" />
          <button className="btn">{editId ? 'Save changes' : 'Save passenger'}</button>
          <button type="button" className="btn ghost" onClick={() => { setShowForm(false); setEditId(null); setF(empty); }}>Cancel</button>
        </form>
      ) : (
        <button className="btn flush" style={{ marginBottom: 14 }} onClick={() => { setShowForm(true); setMsg(''); }}><Icon name="plus" /> Add passenger</button>
      )}

      <div className="search">
        <Icon name="search" size={18} />
        <input type="search" placeholder="Search name, phone or address" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {list === null && <><div className="sk" /><div className="sk" /></>}
      {list?.length === 0 && (
        <div className="empty"><span className="circle"><Icon name="users" size={30} /></span><p>{q ? 'No passengers match your search.' : 'No passengers yet. Add the first one.'}</p></div>
      )}
      {list?.map((p, i) => (
        <div key={p._id} className="card" style={{ animationDelay: `${i * 40}ms` }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar name={p.name} size={46} />
            <h3>{p.name}</h3>
          </div>
          <div className="meta"><Icon name="pin" size={16} /><span>{p.address}{p.landmark && <span className="muted"> · Near {p.landmark}</span>}</span></div>
          {p.details && <div className="meta"><Icon name="info" size={16} /><span className="muted">{p.details}</span></div>}
          <div className="actions">
            {p.phone && <a className="pill call" href={telHref(p.phone)}><Icon name="phone" size={16} /> Call</a>}
            <a className="pill go" href={mapsUrl(p.address)} target="_blank" rel="noreferrer"><Icon name="navigate" size={16} /> Map</a>
            <button className="pill" onClick={() => edit(p)}><Icon name="edit" size={16} /> Edit</button>
            <button className="pill danger" onClick={() => remove(p)}><Icon name="trash" size={16} /> Delete</button>
          </div>
          {routes.length > 0 && (
            <select value="" onChange={(e) => addToRoute(p, e.target.value)} style={{ marginTop: 12 }}>
              <option value="">Add to route…</option>
              {routes.map((r) => <option key={r._id} value={r._id}>{r.title}</option>)}
            </select>
          )}
        </div>
      ))}
    </Shell>
  );
}
