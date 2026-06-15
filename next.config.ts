import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prevent firebase client SDK from being bundled for server-side rendering;
  // instead Node.js loads the package directly, which uses its SSR-safe build.
  serverExternalPackages: ['firebase'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
    ],
  },
  // Serve the customer FCM service worker dynamically so Firebase config
  // is injected from env vars at request time rather than being hardcoded.
  async rewrites() {
    return [
      { source: '/firebase-messaging-sw.js', destination: '/api/firebase-messaging-sw' },
    ];
  },
  async headers() {
    return [
      {
        source: '/firebase-messaging-sw.js',
        headers: [{ key: 'Service-Worker-Allowed', value: '/' }],
      },
    ];
  },
};

export default nextConfig;
