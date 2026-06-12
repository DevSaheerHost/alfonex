import { getProduct, getSimilarProducts } from '@/actions/products';
import { notFound }   from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: Props) {
  const { id }  = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const similar = await getSimilarProducts(id, product.category).catch(() => []);

  return <ProductDetailClient product={product} similar={similar} />;
}
