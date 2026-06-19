'use client';

/**
 * SearchTracker
 *
 * Reads the `?q=` URL parameter that ProductCard appends when a user
 * clicks a search result, then writes one record to Firebase RTDB at:
 *
 *   search_analytics/{pushId}
 *   {
 *     query:        "iphone 15 pro",
 *     productId:    "-OuW0_Au...",
 *     productTitle: "iPhone 15 Pro 256GB Silver",
 *     uid:          "userId or null",
 *     timestamp:    1718123456789
 *   }
 *
 * Renders nothing — purely a side-effect component.
 * Must be wrapped in <Suspense> by the parent (Next.js App Router requirement
 * for any component that calls useSearchParams).
 */

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { clientAuth } from '@/lib/firebase/client';
import { getDatabase, ref, push } from 'firebase/database';
import { getApp } from 'firebase/app';

interface Props {
  productId:    string;
  productTitle: string;
}

export default function SearchTracker({ productId, productTitle }: Props) {
  const params = useSearchParams();

  useEffect(() => {
    const query  = params.get('q')?.trim() || null;
    const ref_   = params.get('ref') || null;
    const posRaw = params.get('pos');
    const pos    = posRaw !== null ? Number(posRaw) : null;

    // Skip if no attribution data at all
    if (!query && !ref_) return;

    (async () => {
      try {
        const auth = clientAuth();
        const db   = getDatabase(getApp());

        await push(ref(db, 'search_analytics'), {
          ...(query  && { query }),
          ...(ref_   && { ref: ref_ }),
          ...(pos !== null && { pos }),
          productId,
          productTitle,
          uid:       auth.currentUser?.uid ?? null,
          timestamp: Date.now(),
        });
      } catch { /* silently ignore */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
