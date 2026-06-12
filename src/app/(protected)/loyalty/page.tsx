import { getMyLoyalty } from '@/actions/loyalty';
import LoyaltyClient   from './LoyaltyClient';

export default async function LoyaltyPage() {
  const { points, history, referralCode } = await getMyLoyalty();
  return <LoyaltyClient points={points} history={history} referralCode={referralCode} />;
}
