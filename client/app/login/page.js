'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ls, errMsg } from '@/lib/safe';
import Header from '@/components/Header';
import { Icon } from '@/components/Icons';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', phone: '', password: '', code: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const d = await api(mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body: f });
      if (!d || !d.token || !d.user) throw new Error('Could not log in. Please try again.');
      ls.set('token', d.token);
      ls.set('user', JSON.stringify(d.user));
      router.push('/dashboard');
    } catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  }

  return (
    <div className="page">
      <Header />
      <main>
        <div className="note center">
          <b>Welcome</b>
          {mode === 'login' ? 'Log in to see your routes.' : 'Create your account to get started.'}
        </div>
        <div className="tabs">
          <button className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setErr(''); }}>Log in</button>
          <button className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setErr(''); }}>Create account</button>
        </div>
        <form onSubmit={submit} className="field-card">
          {mode === 'register' && (<><label>Your name</label><input value={f.name} onChange={set('name')} autoComplete="name" required /></>)}
          <label>Phone number</label>
          <input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" required />
          <label>Password</label>
          <input type="password" value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          {mode === 'register' && (<><label>Coordinator code (only if you were given one)</label><input value={f.code} onChange={set('code')} /></>)}
          {err && <div className="error">{err}</div>}
          <button className="btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
        </form>
      </main>
    </div>
  );
}
