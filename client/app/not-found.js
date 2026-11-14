export default function NotFound() {
  return (
    <div className="page">
      <main style={{ textAlign: 'center', paddingTop: 60 }}>
        <h2>Page not found</h2>
        <p className="muted">This page does not exist.</p>
        <a className="btn" href="/dashboard">Go to home</a>
      </main>
    </div>
  );
}
