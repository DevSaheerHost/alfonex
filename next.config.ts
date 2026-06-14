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
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
