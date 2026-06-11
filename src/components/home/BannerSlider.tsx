'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link  from 'next/link';
import type { Banner } from '@/lib/types';

function getBannerHref(b: Banner): string {
  switch (b.actionType) {
    case 'product':      return b.productId ? `/products/${b.productId}` : '/';
    case 'category':     return b.category  ? `/search?q=${encodeURIComponent(b.category)}` : '/';
    case 'new_arrivals': return '/';
    case 'featured':     return '/';
    default:             return '/';
  }
}

export default function BannerSlider({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0);
  const touchX   = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((idx: number) => {
    setCurrent((idx + banners.length) % banners.length);
  }, [banners.length]);

  const resetInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (banners.length > 1) {
      intervalRef.current = setInterval(
        () => setCurrent((c) => (c + 1) % banners.length),
        4000,
      );
    }
  }, [banners.length]);

  useEffect(() => {
    resetInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [resetInterval]);

  if (!banners.length) return null;

  const banner = banners[current];

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const diff = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      go(diff > 0 ? current + 1 : current - 1);
      resetInterval();
    }
    touchX.current = null;
  };

  return (
    <div className="mb-5">
      {/* Slide */}
      <div
        className="relative overflow-hidden rounded-2xl"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="relative min-h-[168px]"
          style={{ background: banner.gradient || 'linear-gradient(135deg,#16a34a,#15803d)' }}
        >
          {/* Background image — plain img so any external URL works */}
          {banner.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-30"
            />
          )}

          {/* Content */}
          <Link href={getBannerHref(banner)} className="relative z-10 block p-5">
            {banner.badge && (
              <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold tracking-wide text-white backdrop-blur-sm">
                {banner.badge}
              </span>
            )}
            <p className="font-heading text-xl font-bold leading-snug text-white">
              {banner.title}
            </p>
            {banner.subtitle && (
              <p className="mt-1 text-sm text-white/80">{banner.subtitle}</p>
            )}
            {banner.btnLabel && (
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm">
                {banner.btnLabel}
                <i className="fa fa-arrow-right text-[11px]" />
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => { go(i); resetInterval(); }}
              aria-label={`Go to banner ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-5 bg-primary-500'
                  : 'w-1.5 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
