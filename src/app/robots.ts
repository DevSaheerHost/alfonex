import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow:    ['/', '/products/', '/search', '/converter'],
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
