'use client';
import { useEffect } from 'react';

export default function AdminLoginRedirect() {
  useEffect(() => {
    window.location.replace('/admin');
  }, []);

  return (
    <html>
      <head><meta charSet="utf-8" /><title>Alfonex Admin</title></head>
      <body style={{ margin: 0, background: '#0c1a10', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ color: '#fff', fontFamily: 'system-ui', fontSize: 14, opacity: 0.6 }}>Loading…</div>
      </body>
    </html>
  );
}
