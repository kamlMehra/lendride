'use client';
// Shown if anything unexpected still goes wrong, instead of a blank white screen
export default function ErrorPage({ reset }) {
  return (
    <div className="page">
      <main style={{ textAlign: 'center', paddingTop: 60 }}>
        <h2>Something went wrong</h2>
        <p className="muted">Please try again.</p>
        <button className="btn" onClick={() => reset()}>Try again</button>
        <a className="btn ghost" href="/dashboard">Go to home</a>
      </main>
    </div>
  );
}
