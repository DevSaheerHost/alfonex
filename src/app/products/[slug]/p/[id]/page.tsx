import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getProduct, getSimilarProducts } from '@/actions/products';
import { getProductReviews }              from '@/actions/reviews';
import ProductDetailClient                from '@/app/products/[id]/ProductDetailClient';
import { slugify }                        from '@/lib/slug';

const BASE = 'https://alfonex.com';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return {};

  const slug        = slugify(product.title);
  const title       = product.title;
  const description = product.description
    ? product.description.replace(/::/g, ' ').replace(/\n/g, ' ').slice(0, 155)
    : `Buy ${product.title} at Alfonex. Genuine Apple device. Available in USD, AED & INR.`;
  const canonical   = `${BASE}/products/${slug}/p/${id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title:       `${title} — Alfonex`,
      description,
      url:         canonical,
      type:        'website',
      images: [{ url: product.imageUrl, width: 800, height: 800, alt: product.title }],
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${title} — Alfonex`,
      description,
      images:      [product.imageUrl],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug, id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  // Canonical redirect: wrong slug → correct slug (prevents duplicate content)
  const correctSlug = slugify(product.title);
  if (slug !== correctSlug) {
    redirect(`/products/${correctSlug}/p/${id}`);
  }

  const [similar, reviews] = await Promise.all([
    getSimilarProducts(id, product.category).catch(() => []),
    getProductReviews(id).catch(() => []),
  ]);

  const canonical = `${BASE}/products/${correctSlug}/p/${id}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type':    'Product',
    name:        product.title,
    description: product.description || product.title,
    image:       product.imageUrl,
    url:         canonical,
    brand: { '@type': 'Brand', name: 'Apple' },
    offers: {
      '@type':       'Offer',
      price:          product.priceAED ?? product.price,
      priceCurrency: 'AED',
      availability:  product.isOOS || product.stock === 0
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'Alfonex', url: BASE },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} similar={similar} reviews={reviews} />
    </>
  );
}
