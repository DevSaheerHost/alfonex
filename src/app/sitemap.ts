import type { MetadataRoute } from 'next';
import { getProducts } from '@/actions/products';
import { slugify }     from '@/lib/slug';

const BASE = 'https://alfonex.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts().catch(() => []);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url:             BASE,
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        1,
    },
    {
      url:             `${BASE}/search`,
      lastModified:    new Date(),
      changeFrequency: 'weekly',
      priority:        0.8,
    },
    {
      url:             `${BASE}/converter`,
      lastModified:    new Date(),
      changeFrequency: 'monthly',
      priority:        0.3,
    },
  ];

  const productPages: MetadataRoute.Sitemap = products
    .filter((p) => !p.isHidden)
    .map((p) => ({
      url:             `${BASE}/products/${slugify(p.title)}/p/${p.id}`,
      lastModified:    new Date(p.createdAt),
      changeFrequency: 'weekly' as const,
      priority:        p.isFeatured ? 0.95 : 0.85,
    }));

  return [...staticPages, ...productPages];
}
