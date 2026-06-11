'use server';

import { cookies } from 'next/headers';
import { adminAuth, adminRtdb } from '@/lib/firebase/admin';
import type { UserProfile, Address } from '@/lib/types';

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function verifySession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('__session')?.value;
  if (!session) throw new Error('Unauthenticated');
  return adminAuth().verifySessionCookie(session, true);
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<UserProfile | null> {
  const user = await verifySession();
  const snap = await adminRtdb().ref(`users/${user.uid}`).get();
  if (!snap.exists()) return null;
  return { uid: user.uid, ...snap.val() } as UserProfile;
}

export async function upsertProfile(
  data: Partial<Pick<UserProfile, 'name' | 'whatsapp'>>,
): Promise<void> {
  const user = await verifySession();
  await adminRtdb().ref(`users/${user.uid}`).update({
    ...data,
    updatedAt: new Date().toISOString(),
  });
  if (data.name) {
    await adminAuth().updateUser(user.uid, { displayName: data.name });
  }
}

// ─── Addresses ────────────────────────────────────────────────────────────────

export async function getAddresses(): Promise<Address[]> {
  const user = await verifySession();
  const snap = await adminRtdb().ref(`addresses/${user.uid}`).get();
  if (!snap.exists()) return [];

  return Object.entries(snap.val() as Record<string, object>).map(
    ([id, data]) => ({ id, ...data }) as Address,
  );
}

export async function saveAddress(
  address: Omit<Address, 'id'>,
): Promise<{ id: string }> {
  const user = await verifySession();
  const ref  = adminRtdb().ref(`addresses/${user.uid}`).push();
  await ref.set(address);
  return { id: ref.key! };
}

export async function deleteAddress(addressId: string): Promise<void> {
  const user = await verifySession();
  await adminRtdb().ref(`addresses/${user.uid}/${addressId}`).remove();
}

export async function setPrimaryAddress(addressId: string): Promise<void> {
  const user    = await verifySession();
  const snap    = await adminRtdb().ref(`addresses/${user.uid}`).get();
  if (!snap.exists()) return;

  const updates: Record<string, boolean> = {};
  Object.keys(snap.val()).forEach((id) => {
    updates[`addresses/${user.uid}/${id}/primary`] = id === addressId;
  });
  await adminRtdb().ref().update(updates);
}
