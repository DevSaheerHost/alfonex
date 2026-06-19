import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host') ?? '';
  const isMainDomain = host === 'alfonex.com' || host === 'www.alfonex.com';

  // Non-production URLs (Vercel preview, localhost, etc.) — block everything.
  // This ensures the admin URL at alfonex.vercel.app is never indexed.
  if (!isMainDomain) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  // Main production domain — fully open for the pages customers should find.
  return {
    rules: [
      {
        userAgent: '*',
        allow:    ['/', '/search', '/converter'],
        disallow: [
          '/checkout',
          '/cart',
          '/orders/',
          '/profile',
          '/addresses',
          '/wishlist',
          '/loyalty',
          '/warranty',
          '/login',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://alfonex.com/sitemap.xml',
  };
}
