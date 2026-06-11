'use server';

import { adminRtdb } from '@/lib/firebase/admin';
import type { WarrantyDevice } from '@/lib/types';

export async function getWarrantyDevice(imei: string): Promise<WarrantyDevice | null> {
  const clean = imei.replace(/\D/g, '');
  if (clean.length < 15) return null;
  try {
    const snap = await adminRtdb().ref(`warranty_devices/${clean}`).get();
    if (!snap.exists()) return null;
    return { imei: clean, ...snap.val() } as WarrantyDevice;
  } catch {
    return null;
  }
}
