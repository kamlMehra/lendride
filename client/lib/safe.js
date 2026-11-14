// Small helpers so a missing (null / undefined / wrong type) value never crashes the app.
// Always returns an array and drops empty (null / undefined) items
export const arr = (x) => (Array.isArray(x) ? x.filter((i) => i !== null && i !== undefined) : []);
export const str = (x) => (x === null || x === undefined ? '' : String(x));
export const lower = (x) => str(x).toLowerCase();
export const normTrip = (t) => (t && typeof t === 'object' ? { ...t, stops: arr(t.stops).filter(Boolean) } : null);
export const normTrips = (list) => arr(list).map(normTrip).filter(Boolean);
export const errMsg = (e) => (e && e.message) || 'Something went wrong. Please try again.';

// localStorage can throw (private mode, blocked storage), so every use goes through here
export const ls = {
  get(k) { try { return window.localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch { /* ignore */ } },
  clear() { try { window.localStorage.clear(); } catch { /* ignore */ } },
};
