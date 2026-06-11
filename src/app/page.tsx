import { getProducts, getFeaturedProducts } from '@/actions/products';
import ShopClientShell from './ShopClientShell';

export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  const [products, featured] = await Promise.all([
    getProducts().catch(() => []),
    getFeaturedProducts().catch(() => []),
  ]);

  return <ShopClientShell products={products} featured={featured} />;
}
