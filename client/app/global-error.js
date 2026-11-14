'use client';
export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Georgia, serif', background: '#fdf8ee', textAlign: 'center', padding: '60px 16px' }}>
        <h2>Something went wrong</h2>
        <p>Please try again.</p>
        <button onClick={() => reset()} style={{ background: '#8b0000', color: '#fff', border: 0, borderRadius: 12, padding: '14px 28px', fontSize: 18 }}>Try again</button>
      </body>
    </html>
  );
}
