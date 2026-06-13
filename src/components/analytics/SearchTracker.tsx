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
    const query = params.get('q')?.trim();
    if (!query) return; // not a search-driven visit — skip

    // Fire-and-forget: analytics must never affect page behaviour
    (async () => {
      try {
        // clientAuth() ensures Firebase is initialised
        const auth = clientAuth();
        const db   = getDatabase(getApp());

        await push(ref(db, 'search_analytics'), {
          query,
          productId,
          productTitle,
          uid:       auth.currentUser?.uid ?? null,
          timestamp: Date.now(),
        });
      } catch {
        // Silently ignore — analytics failure must never surface to the user
      }
    })();
  // Run once per page load; params reference is stable between re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
