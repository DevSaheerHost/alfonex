'use server';

import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
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

  const doc = await adminDb().collection('users').doc(user.uid).get();
  if (!doc.exists) return null;
  return { uid: doc.id, ...doc.data() } as UserProfile;
}

export async function upsertProfile(
  data: Partial<Pick<UserProfile, 'name' | 'whatsapp'>>,
): Promise<void> {
  const user = await verifySession();

  await adminDb()
    .collection('users')
    .doc(user.uid)
    .set(
      { ...data, updatedAt: new Date().toISOString() },
      { merge: true },
    );

  if (data.name) {
    await adminAuth().updateUser(user.uid, { displayName: data.name });
  }
}

// ─── Addresses ────────────────────────────────────────────────────────────────

export async function getAddresses(): Promise<Address[]> {
  const user = await verifySession();

  const snap = await adminDb()
    .collection('users')
    .doc(user.uid)
    .collection('addresses')
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Address);
}

export async function saveAddress(
  address: Omit<Address, 'id'>,
): Promise<{ id: string }> {
  const user = await verifySession();

  const ref = adminDb()
    .collection('users')
    .doc(user.uid)
    .collection('addresses')
    .doc();

  await ref.set(address);
  return { id: ref.id };
}

export async function deleteAddress(addressId: string): Promise<void> {
  const user = await verifySession();

  await adminDb()
    .collection('users')
    .doc(user.uid)
    .collection('addresses')
    .doc(addressId)
    .delete();
}

export async function setPrimaryAddress(addressId: string): Promise<void> {
  const user = await verifySession();
  const col = adminDb()
    .collection('users')
    .doc(user.uid)
    .collection('addresses');

  const batch = adminDb().batch();
  const snap = await col.get();
  snap.docs.forEach((d) =>
    batch.update(d.ref, { primary: d.id === addressId }),
  );
  await batch.commit();
}
