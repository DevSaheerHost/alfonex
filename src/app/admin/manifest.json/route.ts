export async function GET() {
  const manifest = {
    name:             'Alfonex Admin',
    short_name:       'Admin',
    description:      'Alfonex Admin Dashboard — manage products, orders, and customers.',
    start_url:        '/admin',
    scope:            '/admin',
    display:          'standalone',
    orientation:      'portrait-primary',
    background_color: '#0c1a10',
    theme_color:      '#2EA056',
    categories:       ['business', 'productivity'],
    icons: [
      {
        src:     '/icons/admin-192.png',
        sizes:   '192x192',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     '/icons/admin-512.png',
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'any maskable',
      },
      {
        src:     '/icons/admin-apple.png',
        sizes:   '180x180',
        type:    'image/png',
        purpose: 'any',
      },
    ],
    screenshots: [],
    shortcuts: [
      {
        name:      'Orders',
        url:       '/admin#orders',
        icons:     [{ src: '/icons/admin-192.png', sizes: '192x192' }],
      },
      {
        name:      'Products',
        url:       '/admin#products',
        icons:     [{ src: '/icons/admin-192.png', sizes: '192x192' }],
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type':  'application/manifest+json',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
