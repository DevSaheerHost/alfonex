import { redirect } from 'next/navigation';
import { getMyReturns } from '@/actions/returns';
import ReturnsClient from './ReturnsClient';

export default async function ReturnsPage() {
  let returns;
  try {
    returns = await getMyReturns();
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? '';
    if (msg === 'Unauthenticated') redirect('/login');
    returns = [];
  }

  return <ReturnsClient returns={returns} />;
}
