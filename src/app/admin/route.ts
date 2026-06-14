export const runtime = 'nodejs';

import { readFileSync }  from 'fs';
import { join }          from 'path';
import { cookies }       from 'next/headers';
import { redirect }      from 'next/navigation';
import { verifyAdminToken } from '@/lib/adminAuth';

const TOKENS: Record<string, string | undefined> = {
  '%%FB_API_KEY%%':             process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  '%%FB_AUTH_DOMAIN%%':         process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  '%%FB_DATABASE_URL%%':        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  '%%FB_PROJECT_ID%%':          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  '%%FB_STORAGE_BUCKET%%':      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  '%%FB_MESSAGING_SENDER_ID%%': process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  '%%FB_APP_ID%%':              process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  '%%VAPID_KEY%%':              process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '',
  '%%CLD_CLOUD%%':              process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  '%%CLD_PRESET%%':             process.env.ADMIN_CLD_PRESET ?? 'Alfonex',
  '%%SITE_BASE%%':              process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alfonex.com',
};

export async function GET() {
  // Verify admin session cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('__admin_sess')?.value;
  if (!token || !(await verifyAdminToken(token))) {
    redirect('/admin/login');
  }

  // Read and inject config into admin HTML
  let html = readFileSync(
    join(process.cwd(), 'private', 'admin.html'),
    'utf-8',
  );

  for (const [placeholder, value] of Object.entries(TOKENS)) {
    if (value) html = html.replaceAll(placeholder, value);
  }

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
