'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#f3f4f6' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '16px',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '2rem' }}>⚠️</p>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111' }}>
            Something went wrong
          </h2>
          <button
            onClick={reset}
            style={{
              background: '#2EA056',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
