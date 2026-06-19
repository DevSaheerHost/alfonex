import { ImageResponse } from 'next/og';
import { getProduct } from '@/actions/products';
import { cldUrl } from '@/lib/cldUrl';

export const size        = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return new ImageResponse(
      <div style={{ width: 1200, height: 630, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 48, fontWeight: 800 }}>Alfonex</span>
      </div>,
      { ...size },
    );
  }

  const price  = product.priceAED ?? product.price ?? 0;
  const imgSrc = cldUrl(product.imageUrl, 'f_auto,q_auto,w_600');

  return new ImageResponse(
    <div
      style={{
        width: 1200, height: 630,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex', alignItems: 'center', padding: '60px 80px', gap: 60,
        fontFamily: 'sans-serif',
      }}
    >
      {/* Product image */}
      {imgSrc && (
        <div style={{ width: 420, height: 420, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt={product.title} style={{ width: 380, height: 380, objectFit: 'contain' }} />
        </div>
      )}

      {/* Text */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e', letterSpacing: 2, textTransform: 'uppercase' }}>
          Alfonex
        </div>
        <div style={{ fontSize: 44, fontWeight: 800, color: '#ffffff', lineHeight: 1.15 }}>
          {product.title}
        </div>
        {product.grade && (
          <div style={{ fontSize: 18, color: '#94a3b8' }}>
            {product.grade === 'a1+' ? 'Excellent condition' : product.grade === 'a2+' ? 'Very Good condition' : 'Good condition'}
          </div>
        )}
        <div style={{ fontSize: 52, fontWeight: 900, color: '#22c55e', marginTop: 16 }}>
          AED {price.toLocaleString()}
        </div>
        <div style={{ fontSize: 16, color: '#64748b', marginTop: 8 }}>
          alfonex.com · Genuine Apple Devices
        </div>
      </div>
    </div>,
    { ...size },
  );
}
