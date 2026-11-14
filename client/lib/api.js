import { arr, str, ls } from './safe';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function api(path, { method = 'GET', body } = {}) {
  const token = ls.get('token');
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check your internet and try again.');
  }
  const data = await res.json().catch(() => null);
  if (res.status === 401) { ls.clear(); if (typeof window !== 'undefined') window.location.href = '/login'; }
  if (!res.ok) throw new Error((data && data.message) || 'Something went wrong. Please try again.');
  return data;
}

export function getUser() {
  try {
    const u = JSON.parse(ls.get('user'));
    return u && typeof u === 'object' ? u : null;
  } catch { return null; }
}

export const fmtDate = (d) => {
  const x = new Date(d);
  return d && !isNaN(x)
    ? x.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
};

export const mapsUrl = (q) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(str(q));
export const statusLabel = { upcoming: 'Upcoming', active: 'On the way', completed: 'Completed' };
export const statusText = (s) => statusLabel[s] || str(s);
export const doneCount = (t) => arr(t?.stops).filter((s) => s?.done).length;

// tel: link that works even if the number was typed with spaces or dashes
export const telHref = (p) => 'tel:' + str(p).replace(/[^\d+]/g, '');

// Downloads a file from the API (needs the login token, so a plain link will not work)
export async function downloadFile(path, filename) {
  const token = ls.get('token');
  let res;
  try {
    res = await fetch(BASE + path, { headers: { ...(token && { Authorization: 'Bearer ' + token }) } });
  } catch {
    throw new Error('Cannot reach the server. Check your internet and try again.');
  }
  if (!res.ok) {
    const d = await res.json().catch(() => null);
    throw new Error((d && d.message) || 'Download failed');
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
