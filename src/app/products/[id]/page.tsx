import { redirect, notFound } from 'next/navigation';
import { getProduct }          from '@/actions/products';
import { slugify }             from '@/lib/slug';

interface Props {
  params: Promise<{ id: string }>;
}

// Old URL /products/[id] — redirects to SEO-friendly /products/[slug]/p/[id]
export default async function ProductRedirectPage({ params }: Props) {
  const { id }  = await params;
  const product = await getProduct(id).catch(() => null);
  if (!product) notFound();
  redirect(`/${slugify(product.title)}/p/${id}`);
}
