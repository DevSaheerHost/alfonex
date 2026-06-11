'use server';

import { adminRtdb } from '@/lib/firebase/admin';
import type { Banner } from '@/lib/types';

export async function getBanners(): Promise<Banner[]> {
  try {
    const snap = await adminRtdb().ref('banners').get();
    if (!snap.exists()) return [];
    return Object.entries(snap.val() as Record<string, object>)
      .map(([id, data]) => ({ id, ...data }) as Banner)
      .filter((b) => b.active)
      .sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}
