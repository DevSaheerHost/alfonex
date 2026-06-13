'use client';

import Image   from 'next/image';
import Link    from 'next/link';
import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useApp, useProductPrice } from '@/contexts/AppContext';
import { useCart }                  from '@/contexts/CartContext';
import { useWishlist }              from '@/contexts/WishlistContext';
import ReserveModal                 from '@/components/products/ReserveModal';
import ProductScrollRow             from '@/components/products/ProductScrollRow';
import ProductReviews               from '@/components/reviews/ProductReviews';
import SearchTracker                from '@/components/analytics/SearchTracker';
import type { Product, VariantGroup, VariantValue, Review } from '@/lib/types';
import { CURRENCY_SYMBOLS }         from '@/lib/types';
import { variantHref }              from '@/lib/slug';

const GRADE_INFO: Record<string, { label: string; color: string; desc: string }> = {
  'a1+': { label: 'Excellent',  color: 'text-green-600',  desc: 'Like new · Sealed or minimal use' },
  'a2+': { label: 'Very Good',  color: 'text-blue-600',   desc: 'Light signs of use · Fully functional' },
  'a3+': { label: 'Good',       color: 'text-yellow-600', desc: 'Visible wear · Fully functional' },
};

// ── Highlight parser ───────────────────────────────────────────────────────────
// Each description line: "Label:: Value" or "Label:: Value:: Sub"
// Returns null if no "::" found → fall back to plain text.
interface Highlight { label: string; value: string; sub?: string; icon: string }

const ICON_MAP: [RegExp, string][] = [
  [/ram|rom|memory|storage/i,          'fa-memory'],
  [/processor|cpu|chip|core/i,         'fa-microchip'],
  [/rear.?camera|back.?camera/i,       'fa-camera'],
  [/front.?camera|selfie|facetime/i,   'fa-camera-rotate'],
  [/display|screen|oled|amoled/i,      'fa-mobile-screen'],
  [/battery/i,                         'fa-battery-full'],
  [/ios|android|os|software/i,         'fa-mobile'],
  [/wifi|bluetooth|5g|4g|sim|network/i,'fa-wifi'],
  [/weight/i,                          'fa-weight-scale'],
  [/color|colour/i,                    'fa-palette'],
  [/warranty/i,                        'fa-shield-halved'],
  [/water|dust|resistant/i,            'fa-droplet'],
  [/speaker|audio|sound/i,             'fa-volume-high'],
  [/sensor|face.?id|touch.?id/i,       'fa-fingerprint'],
  [/charg|fast.?charge/i,              'fa-bolt'],
  [/dim|size|height|width|thick/i,     'fa-ruler'],
];

function iconFor(label: string) {
  const match = ICON_MAP.find(([re]) => re.test(label));
  return match ? match[1] : 'fa-circle-info';
}

// Parses description into { highlights, plainText }.
// Separator "---" on its own line splits highlights from description.
// Either part is optional.
interface ParsedDescription {
  highlights: Highlight[];
  plainText:  string;
}

function parseDescription(desc: string): ParsedDescription {
  const SEP = /^-{3,}$/m; // a line of 3+ dashes
  const [highlightRaw, plainRaw] = SEP.test(desc)
    ? desc.split(SEP).map((s) => s.trim())
    : desc.includes('::')
      ? [desc.trim(), '']   // only highlights
      : ['', desc.trim()];  // only plain text

  const highlights: Highlight[] = highlightRaw
    ? highlightRaw
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.includes('::'))
        .map((line) => {
          const parts = line.split('::').map((p) => p.trim());
          return { label: parts[0], value: parts[1], sub: parts[2], icon: iconFor(parts[0]) } as Highlight;
        })
    : [];

  return { highlights, plainText: plainRaw ?? '' };
}

// Known Apple/device color → CSS background
const COLOR_SWATCHES: Record<string, string> = {
  'black':            '#1c1c1e',
  'space black':      '#2c2c2e',
  'space gray':       '#6e6e73',
  'midnight':         '#1c2433',
  'starlight':        '#f2e8d9',
  'silver':           '#e8e8ed',
  'white':            '#f5f5f7',
  'gold':             '#f5e2b8',
  'rose gold':        '#f0cfc3',
  'pink':             '#fac8d0',
  'red':              '#e0001a',
  'product red':      '#e0001a',
  'blue':             '#3478f6',
  'deep blue':        '#19234d',
  'storm blue':       '#4a6278',
  'alpine green':     '#4e6b5e',
  'green':            '#2d6a3f',
  'purple':           '#7e5bef',
  'yellow':           '#f5e642',
  'orange':           '#f56c1e',
  'cosmic orange':    '#e55b00',
  'coral':            '#ff6b52',
  'natural':          '#d4c5b0',
  'natural titanium': '#baa98c',
  'black titanium':   '#333336',
  'white titanium':   '#f0efed',
  'desert titanium':  '#c5a882',
  'titanium':         '#8e8d92',
};

const isColorGroup = (name: string) => /colo(u?)r/i.test(name);

interface Props {
  product:         Product;
  similar:         Product[];
  reviews:         Review[];
  initialVariants: Record<string, string>;
}

export default function ProductDetailClient({ product, similar, reviews, initialVariants }: Props) {
  const router          = useRouter();
  const { currency }    = useApp();
  const getProdPrice    = useProductPrice();
  const { addToCart }   = useCart();
  const { toggle, has } = useWishlist();
  const wished          = has(product.id);
  const [reserveOpen, setReserveOpen] = useState(false);

  const price  = getProdPrice(product);
  const symbol = CURRENCY_SYMBOLS[currency];
  const grade  = GRADE_INFO[product.grade];
  const isOOS  = product.isOOS || product.stock === 0;

  // Variant selection — seeded from the URL slug by the server
  const [selected, setSelected] = useState<Record<string, string>>(initialVariants);

  // Displayed image — resolved from the initially-selected colour variant, or falls back to main image
  const [displayImage, setDisplayImage] = useState(() => {
    for (const group of product.variants ?? []) {
      if (!isColorGroup(group.name)) continue;
      const match = group.values.find((v) => v.label === initialVariants[group.name]);
      if (match?.imageUrl) return match.imageUrl;
    }
    return product.imageUrl;
  });

  // Called when the user picks any variant value.
  // Colour clicks also switch the hero image and navigate to the variant URL
  // so each colour has its own SEO-indexed page.
  const handleVariantSelect = (groupName: string, value: VariantValue) => {
    const newSelected = { ...selected, [groupName]: value.label };
    setSelected(newSelected);

    if (isColorGroup(groupName)) {
      // Instant image swap — no navigation lag
      setDisplayImage(value.imageUrl || product.imageUrl);
      // Navigate to the variant slug URL (scroll:false keeps position stable)
      router.replace(variantHref(product, newSelected), { scroll: false });
    }
  };

  const variantLabel = product.variants
    ?.map((g: VariantGroup) => `${g.name}: ${selected[g.name] ?? ''}`)
    .filter((s) => s.endsWith(': ') === false && !s.endsWith(': '))
    .join(' / ') ?? '';

  const allSelected = product.variants?.every((g) => selected[g.name]);
  const canAddToCart = !isOOS && (product.variants?.length === 0 || allSelected);

  const handleAddToCart = () => {
    if (!canAddToCart) return;

    const cartId = product.variants?.length
      ? `${product.id}__${variantLabel}`
      : product.id;

    addToCart({
      id:           cartId,
      productId:    product.id,
      name:         product.title,
      price,
      costPrice:    product.costPrice,
      imageUrl:     product.imageUrl,
      qty:          1,
      variantLabel: variantLabel || '',
      grade:        product.grade,
    });
  };

  return (
    <div className="page-wrapper">
      {/* Reads ?q= param and logs the search-to-click event to RTDB.
          Suspense is required by Next.js for any useSearchParams caller. */}
      <Suspense fallback={null}>
        <SearchTracker productId={product.id} productTitle={product.title} />
      </Suspense>
      {/* Back */}
      <Link href="/" className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
        <i className="fa fa-arrow-left" /> Back
      </Link>

      {/* Desktop: side-by-side | Mobile: stacked */}
      <div className="lg:flex lg:gap-8">

        {/* Image */}
        <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-800 lg:mb-0 lg:w-[420px] lg:flex-shrink-0">
          <Image
            src={displayImage}
            alt={product.title}
            fill
            className="object-contain p-4"
            sizes="(max-width: 1024px) 100vw, 420px"
            priority
          />
          {product.isOnSale     && <span className="badge badge-red absolute left-3 top-3">On Sale</span>}
          {product.isNewArrival && <span className="badge badge-green absolute left-3 top-3">New Arrival</span>}
        </div>

        {/* Right column */}
        <div className="flex flex-1 flex-col">
          {/* Info */}
          <div className="mb-4">
            <h1 className="font-heading text-xl font-bold leading-snug dark:text-gray-100 lg:text-2xl">
              {product.title}
            </h1>

            {grade && (
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-sm font-semibold ${grade.color}`}>{grade.label}</span>
                <span className="text-xs text-gray-400">— {grade.desc}</span>
              </div>
            )}

            <div className="mt-3 flex items-center gap-3">
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 lg:text-3xl">
                {symbol}{price.toLocaleString()}
              </p>
              <button
                onClick={() => toggle(product.id)}
                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium transition hover:border-red-300 hover:text-red-500 dark:border-gray-700 dark:text-gray-300"
              >
                <i className={`fa-heart text-sm ${wished ? 'fa-solid text-red-500' : 'fa-regular text-gray-400'}`} />
                {wished ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          {/* Variants */}
          {product.variants?.map((group: VariantGroup) => {
            const currentVal = selected[group.name];
            const colorGroup = isColorGroup(group.name);
            return (
              <div key={group.name} className="mb-5">
                {/* Label row: "Color: Silver" */}
                <p className="mb-2.5 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {group.name}
                  {currentVal && (
                    <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
                      : {currentVal}
                    </span>
                  )}
                </p>

                {colorGroup ? (
                  /* ── Color swatches ── */
                  <div className="flex flex-wrap gap-3">
                    {group.values.map((v) => {
                      const active = currentVal === v.label;
                      const oos    = v.stock === 0;
                      const bg     = COLOR_SWATCHES[v.label.toLowerCase()] ?? '#e5e7eb';
                      const isLight = ['starlight', 'silver', 'white', 'white titanium', 'gold', 'starlight'].includes(v.label.toLowerCase());
                      return (
                        <button
                          key={v.label}
                          disabled={oos}
                          onClick={() => handleVariantSelect(group.name, v)}
                          className={`flex flex-col items-center gap-1 transition ${oos ? 'cursor-not-allowed opacity-40' : 'hover:opacity-90'}`}
                        >
                          <span
                            className={`flex h-11 w-11 rounded-xl border-2 transition ${
                              active
                                ? 'border-primary-500 ring-2 ring-primary-400 ring-offset-1 dark:ring-offset-gray-900'
                                : `border-gray-200 dark:border-gray-700 ${!oos ? 'hover:border-primary-300' : ''}`
                            } ${oos ? 'relative overflow-hidden' : ''}`}
                            style={{ backgroundColor: bg, boxShadow: isLight ? 'inset 0 0 0 1px rgba(0,0,0,.08)' : undefined }}
                          >
                            {oos && (
                              /* diagonal strikethrough line for OOS color swatches */
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="h-px w-[130%] rotate-45 bg-gray-400 opacity-70" />
                              </span>
                            )}
                          </span>
                          <span className={`text-[10px] font-medium leading-tight ${
                            active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                          } ${oos ? 'line-through' : ''}`}>
                            {v.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* ── Pill buttons (Storage / RAM / etc.) ── */
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((v) => {
                      const active = currentVal === v.label;
                      const oos    = v.stock === 0;
                      return (
                        <button
                          key={v.label}
                          disabled={oos}
                          onClick={() => handleVariantSelect(group.name, v)}
                          className={`rounded-full border-2 px-4 py-1.5 text-sm font-semibold transition
                            ${oos
                              ? 'cursor-not-allowed border-gray-100 text-gray-300 line-through dark:border-gray-800 dark:text-gray-600'
                              : active
                                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                                : 'border-gray-300 text-gray-700 hover:border-primary-400 dark:border-gray-600 dark:text-gray-300'}`}
                        >
                          {v.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Highlights + Description — both shown when separated by "---" */}
          {product.description && (() => {
            const { highlights, plainText } = parseDescription(product.description);
            return (
              <>
                {highlights.length > 0 && (
                  <div className="card mb-4 p-4">
                    <p className="mb-4 text-sm font-bold text-gray-900 dark:text-gray-100">Highlights</p>
                    <ul className="space-y-4">
                      {highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                            <i className={`fa-solid ${h.icon} text-sm text-gray-500 dark:text-gray-400`} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs text-gray-400 dark:text-gray-500">{h.label}</p>
                            <p className="text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">{h.value}</p>
                            {h.sub && (
                              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{h.sub}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {plainText && (
                  <div className="card mb-4 p-4">
                    <p className="mb-1 text-sm font-semibold dark:text-gray-100">About this product</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                      {plainText}
                    </p>
                  </div>
                )}
              </>
            );
          })()}

          {/* Add to cart + Reserve — sticky on mobile, static on desktop */}
          <div className="sticky bottom-20 bg-gray-100 pb-2 pt-2 dark:bg-[#111] lg:static lg:bg-transparent lg:pb-0 lg:pt-0 lg:dark:bg-transparent">
            {isOOS ? (
              <div className="rounded-2xl bg-gray-200 py-4 text-center text-sm font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Out of Stock
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleAddToCart}
                  disabled={!canAddToCart}
                  className="btn-primary flex-1 lg:flex-none lg:px-10"
                >
                  <i className="fa fa-shopping-bag" />
                  {canAddToCart
                    ? 'Add to Cart'
                    : product.variants?.length
                    ? 'Select options'
                    : 'Add to Cart'}
                </button>
                <button
                  onClick={() => setReserveOpen(true)}
                  className="flex items-center gap-2 rounded-xl border-2 border-primary-500 px-4 py-3 text-sm font-semibold text-primary-600 transition hover:bg-primary-50 active:scale-95 dark:hover:bg-primary-900/20"
                >
                  <i className="fa fa-bookmark" />
                  <span className="hidden sm:inline">Reserve</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ReserveModal
        product={product}
        price={price}
        variantLabel={variantLabel}
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
      />

      <ProductReviews reviews={reviews} />

      <div className="mt-6">
        <ProductScrollRow title="Similar Products" products={similar} />
      </div>
    </div>
  );
}
