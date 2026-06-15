'use server';

import { adminRtdb } from '@/lib/firebase/admin';
import { notifyAdmins } from '@/lib/firebase/notify-admins';
import type { Reservation } from '@/lib/types';

export async function createReservation(
  data: Omit<Reservation, 'createdAt' | 'status'>,
): Promise<void> {
  const reservation: Reservation = {
    ...data,
    status:    'pending',
    createdAt: Date.now(),
  };
  await adminRtdb().ref('reservations').push(reservation);

  try {
    await notifyAdmins(
      `📱 New Reservation — ${data.productTitle}`,
      `${data.customerName} · ${data.variantLabel || data.productTitle} · ${data.currency} ${data.advance} advance`,
      { customerPhone: data.customerPhone },
    );
  } catch { /* never block reservation */ }
}
