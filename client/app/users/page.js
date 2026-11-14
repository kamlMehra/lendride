'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUser, telHref } from '@/lib/api';
import { arr, str, lower, ls, errMsg } from '@/lib/safe';
import Shell from '@/components/Shell';
import { Icon, Avatar } from '@/components/Icons';

export default function Users() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [editId, setEditId] = useState(null);
  const [f, setF] = useState({ name: '', phone: '', role: 'driver', password: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const load = () =>
    api('/users')
      .then((d) => setList(arr(d)))
      .catch((e) => { setErr(errMsg(e)); setList((l) => l ?? []); });

  useEffect(() => {
    const u = getUser();
    if (!u) return router.replace('/login');
    if (u.role !== 'coordinator') return router.replace('/dashboard');
    setMe(u);
    load();
  }, [router]);

  function edit(u) {
    setEditId(u._id);
    setF({ name: str(u.name), phone: str(u.phone), role: u.role === 'coordinator' ? 'coordinator' : 'driver', password: '' });
    setErr(''); setMsg('');
  }

  async function save(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const body = { name: f.name, phone: f.phone, role: f.role };
      if (f.password) body.password = f.password;
      const u = await api('/users/' + editId, { method: 'PUT', body });
      if (!u) throw new Error('Could not save changes. Please try again.');
      if (u._id === me.id) {
        const mine = { ...me, name: u.name, phone: u.phone, role: u.role };
        ls.set('user', JSON.stringify(mine));
        if (u.role !== 'coordinator') return router.replace('/dashboard');
        setMe(mine);
      }
      setMsg(`${u.name} was updated`);
      setEditId(null);
      load();
    } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  }

  async function remove(u) {
    if (!confirm(`Delete ${u.name}? They will no longer be able to log in.`)) return;
    setErr(''); setMsg('');
    try {
      await api('/users/' + u._id, { method: 'DELETE' });
      setMsg(`${u.name} was deleted`);
      load();
    } catch (e) { setErr(errMsg(e)); }
  }

  if (!me) return null;
  const s = str(q).trim().toLowerCase();
  const shown = list?.filter((u) => !s || lower(u?.name).includes(s) || str(u?.phone).includes(s));

  return (
    <Shell>
      <h2>Users</h2>
      {msg && <div className="note" style={{ color: 'var(--green)', background: 'var(--green-soft)', borderColor: '#b8d9bd' }}><Icon name="check" size={16} /> {msg}</div>}
      {err && <div className="error">{err}</div>}

      <div className="search">
        <Icon name="search" size={18} />
        <input type="search" placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {list === null && !err && <><div className="sk" /><div className="sk" /></>}
      {shown?.length === 0 && <div className="empty"><span className="circle"><Icon name="user" size={30} /></span><p>No users found.</p></div>}

      {shown?.map((u, i) => (
        <div key={u._id} className="card" style={{ animationDelay: `${i * 40}ms` }}>
          {editId === u._id ? (
            <form onSubmit={save}>
              <div className="section-title" style={{ marginTop: 0 }}><Icon name="edit" /> Edit user</div>
              <label>Name</label>
              <input value={f.name} onChange={set('name')} required />
              <label>Phone number</label>
              <input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} required />
              <label>Role</label>
              <select value={f.role} onChange={set('role')}>
                <option value="driver">Driver</option>
                <option value="coordinator">Coordinator</option>
              </select>
              <label>New password <span className="muted">(leave empty to keep the current one)</span></label>
              <input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" />
              <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
              <button type="button" className="btn ghost" onClick={() => { setEditId(null); setErr(''); }}>Cancel</button>
            </form>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar name={u.name} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>{u.name}{u._id === me.id && <span className="muted"> (you)</span>}</h3>
                  <div className="muted">{u.phone}</div>
                </div>
                <span className={`chip ${u.role === 'coordinator' ? '' : 'active'}`}>{u.role === 'coordinator' ? 'Coordinator' : 'Driver'}</span>
              </div>
              {u.role === 'driver' && <div className="meta"><Icon name="route" size={16} />{u.activeRoutes ?? 0} current {u.activeRoutes === 1 ? 'route' : 'routes'}</div>}
              <div className="actions">
                <a className="pill call" href={telHref(u.phone)}><Icon name="phone" size={16} /> Call</a>
                <button className="pill" onClick={() => edit(u)}><Icon name="edit" size={16} /> Edit</button>
                {u._id !== me.id && <button className="pill danger" onClick={() => remove(u)}><Icon name="trash" size={16} /> Delete</button>}
              </div>
            </>
          )}
        </div>
      ))}
    </Shell>
  );
}
