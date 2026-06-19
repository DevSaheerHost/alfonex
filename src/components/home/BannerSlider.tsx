'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link  from 'next/link';
import type { Banner } from '@/lib/types';
import { cldUrl } from '@/lib/cldUrl';

function getBannerHref(b: Banner): string {
  switch (b.actionType) {
    case 'product':      return b.productId ? `/products/${b.productId}?ref=banner` : '/';
    case 'category':     return b.category  ? `/search?q=${encodeURIComponent(b.category)}` : '/';
    case 'new_arrivals': return '/';
    case 'featured':     return '/';
    default:             return '/';
  }
}

export default function BannerSlider({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0);
  const touchX      = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((idx: number) => {
    setCurrent((idx + banners.length) % banners.length);
  }, [banners.length]);

  const resetInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (banners.length > 1) {
      intervalRef.current = setInterval(
        () => setCurrent((c) => (c + 1) % banners.length),
        5000,
      );
    }
  }, [banners.length]);

  useEffect(() => {
    resetInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [resetInterval]);

  if (!banners.length) return null;

  const banner = banners[current];

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const diff = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { go(diff > 0 ? current + 1 : current - 1); resetInterval(); }
    touchX.current = null;
  };

  return (
    <div className="mb-5">
      {/* Card */}
      <div
        className="relative overflow-hidden rounded-2xl"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ background: banner.gradient || 'linear-gradient(135deg,#16a34a,#15803d)' }}
      >
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-sm" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/[0.06]" />
        <div className="pointer-events-none absolute right-16 bottom-0 h-20 w-20 rounded-full bg-white/[0.08]" />

        {/* Content row — animates on slide change */}
        <Link
          href={getBannerHref(banner)}
          key={current}
          className="relative z-10 flex min-h-[180px] items-center gap-3 px-5 py-5 lg:min-h-[200px] lg:px-7 animate-banner-fade"
        >
          {/* Left: text */}
          <div className="min-w-0 flex-1">
            {banner.badge && (
              <span className="mb-2.5 inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                {banner.badge}
              </span>
            )}
            <h2 className="font-heading text-xl font-bold leading-snug text-white lg:text-2xl">
              {banner.title}
            </h2>
            {banner.subtitle && (
              <p className="mt-1 text-[13px] leading-relaxed text-white/80 lg:text-sm">
                {banner.subtitle}
              </p>
            )}
            {banner.btnLabel && (
              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-md transition hover:shadow-lg active:scale-95">
                {banner.btnLabel}
                <i className="fa fa-arrow-right text-[10px]" />
              </span>
            )}
          </div>

          {/* Right: product image */}
          {banner.imageUrl && (
            <div className="relative flex h-[130px] w-[110px] flex-shrink-0 items-center justify-center lg:h-[150px] lg:w-[130px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cldUrl(banner.imageUrl, 'f_auto,q_auto,w_300')}
                alt={banner.title}
                className="h-full w-full object-contain drop-shadow-2xl"
              />
            </div>
          )}
        </Link>

        {/* Dot indicators — inside the card */}
        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => { go(i); resetInterval(); }}
                aria-label={`Go to banner ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === current ? 'h-1.5 w-5 bg-white' : 'h-1.5 w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        {/* Desktop prev/next arrows */}
        {banners.length > 1 && (
          <>
            <button
              onClick={() => { go(current - 1); resetInterval(); }}
              aria-label="Previous"
              className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/40 lg:flex"
            >
              <i className="fa fa-chevron-left text-[11px]" />
            </button>
            <button
              onClick={() => { go(current + 1); resetInterval(); }}
              aria-label="Next"
              className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/40 lg:flex"
            >
              <i className="fa fa-chevron-right text-[11px]" />
            </button>
          </>
        )}
      </div>

      {/* Progress bars below */}
      {banners.length > 1 && (
        <div className="mt-2.5 flex gap-1">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => { go(i); resetInterval(); }}
              aria-label={`Go to banner ${i + 1}`}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i === current ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
