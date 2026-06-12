import { getMyLoyalty } from '@/actions/loyalty';
import { redirect }     from 'next/navigation';
import LoyaltyClient    from './LoyaltyClient';

export default async function LoyaltyPage() {
  let data;
  try {
    data = await getMyLoyalty();
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? '';
    if (msg === 'Unauthenticated') redirect('/login');
    // Show empty state instead of crashing — user has 0 pts and a fresh code
    data = { points: 0, history: [], referralCode: '' };
  }

  return (
    <LoyaltyClient
      points={data.points}
      history={data.history}
      referralCode={data.referralCode}
    />
  );
}
