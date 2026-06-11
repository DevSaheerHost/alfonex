'use server';

import { adminRtdb } from '@/lib/firebase/admin';
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
}
