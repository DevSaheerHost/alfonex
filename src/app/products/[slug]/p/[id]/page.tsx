import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { getProduct, getSimilarProducts } from '@/actions/products';
import { getProductReviews }              from '@/actions/reviews';
import ProductDetailClient                from '@/app/products/[id]/ProductDetailClient';
import { slugify, parseVariantsFromSlug } from '@/lib/slug';

const BASE = 'https://alfonex.com';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  const product = await getProduct(id);
  if (!product) return {};

  const baseSlug    = slugify(product.title);
  const validSlug   = slug.startsWith(baseSlug) ? slug : baseSlug;
  const title       = product.title;
  const description = product.description
    ? product.description.replace(/::/g, ' ').replace(/\n/g, ' ').slice(0, 155)
    : `Buy ${product.title} at Alfonex. Genuine Apple device. Available in USD, AED & INR.`;
  const canonical   = `${BASE}/products/${validSlug}/p/${id}`;

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

  const baseSlug = slugify(product.title);

  // Redirect if the slug doesn't start with the correct product base slug.
  // Variant suffixes (e.g. "iphone-17-pro-silver") are intentionally allowed.
  if (!slug.startsWith(baseSlug)) {
    redirect(`/products/${baseSlug}/p/${id}`);
  }

  // Recover which variants are encoded in the slug (e.g. silver, 256gb)
  const initialVariants = parseVariantsFromSlug(slug, product);

  const [similar, reviews] = await Promise.all([
    getSimilarProducts(id, product.category).catch(() => []),
    getProductReviews(id).catch(() => []),
  ]);

  const canonical = `${BASE}/products/${slug}/p/${id}`;
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
      <ProductDetailClient
        product={product}
        similar={similar}
        reviews={reviews}
        initialVariants={initialVariants}
      />
    </>
  );
}
