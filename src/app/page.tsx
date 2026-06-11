import { getProducts, getFeaturedProducts } from '@/actions/products';
import ShopClientShell from './ShopClientShell';

// Always server-render; credentials may not exist at build time
export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  const [products, featured] = await Promise.all([
    getProducts(),
    getFeaturedProducts(),
  ]);

  return (
    <ShopClientShell products={products} featured={featured} />
  );
}
