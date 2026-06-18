import { redirect } from 'next/navigation';
import { getMyTradeIns } from '@/actions/tradeIn';
import TradeInClient from './TradeInClient';

export default async function TradeInPage() {
  let requests;
  try {
    requests = await getMyTradeIns();
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? '';
    if (msg === 'Unauthenticated') redirect('/login');
    requests = [];
  }

  return <TradeInClient requests={requests} />;
}
