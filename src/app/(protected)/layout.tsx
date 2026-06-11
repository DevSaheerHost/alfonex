import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth } from '@/lib/firebase/admin';

// Server-side guard — double-checks the session even after middleware
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session     = cookieStore.get('__session')?.value;

  if (!session) redirect('/login');

  try {
    await adminAuth().verifySessionCookie(session, true);
  } catch {
    redirect('/login');
  }

  return <>{children}</>;
}
