import { cookies } from 'next/headers';
import { getProducts, getFeaturedProducts, getRecommendedProducts } from '@/actions/products';
import { getBanners } from '@/actions/banners';
import { adminAuth } from '@/lib/firebase/admin';
import ShopClientShell from './ShopClientShell';

export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  // Resolve user UID for personalised recommendations (null for guests)
  let uid: string | null = null;
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('__session')?.value;
    if (session) {
      const decoded = await adminAuth().verifySessionCookie(session, false);
      uid = decoded.uid;
    }
  } catch {
    // guest or invalid session — continue without personalisation
  }

  const [products, featured, banners, recommended] = await Promise.all([
    getProducts().catch(() => []),
    getFeaturedProducts().catch(() => []),
    getBanners().catch(() => []),
    getRecommendedProducts(uid).catch(() => []),
  ]);

  const orgJsonLd = {
    '@context':   'https://schema.org',
    '@type':      'Organization',
    name:         'Alfonex',
    url:          'https://alfonex.com',
    logo:         'https://alfonex.com/assets/meta/icon/logo.png',
    description:  'Genuine Apple devices — iPhones, MacBooks, AirPods and Apple Watch.',
    sameAs:       [],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <ShopClientShell
        products={products}
        featured={featured}
        banners={banners}
        recommended={recommended}
      />
    </>
  );
}
