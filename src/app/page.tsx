import { getProducts, getFeaturedProducts } from '@/actions/products';
import { getBanners } from '@/actions/banners';
import ShopClientShell from './ShopClientShell';

export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  const [products, featured, banners] = await Promise.all([
    getProducts().catch(() => []),
    getFeaturedProducts().catch(() => []),
    getBanners().catch(() => []),
  ]);

  return <ShopClientShell products={products} featured={featured} banners={banners} />;
}
