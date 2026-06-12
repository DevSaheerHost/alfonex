import type { Metadata } from 'next';
import { getProduct, getSimilarProducts } from '@/actions/products';
import { notFound }   from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';

const BASE = 'https://alfonex.com';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return {};

  const title       = product.title;
  const description = product.description
    ? product.description.slice(0, 155).replace(/\n/g, ' ')
    : `Buy ${product.title} at Alfonex. Genuine Apple device. Available in USD, AED & INR.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE}/products/${id}` },
    openGraph: {
      title:       `${title} — Alfonex`,
      description,
      url:         `${BASE}/products/${id}`,
      type:        'website',
      images: [{
        url:    product.imageUrl,
        width:  800,
        height: 800,
        alt:    product.title,
      }],
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
  const { id }  = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const similar = await getSimilarProducts(id, product.category).catch(() => []);

  // JSON-LD Product structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type':    'Product',
    name:        product.title,
    description: product.description || product.title,
    image:       product.imageUrl,
    url:         `${BASE}/products/${id}`,
    brand: {
      '@type': 'Brand',
      name:    'Apple',
    },
    offers: {
      '@type':         'Offer',
      price:           product.priceAED ?? product.price,
      priceCurrency:   'AED',
      availability:    product.isOOS || product.stock === 0
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name:    'Alfonex',
        url:     BASE,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product} similar={similar} />
    </>
  );
}
