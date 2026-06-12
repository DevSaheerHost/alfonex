'use client';

import ReferralCopyButton from './ReferralCopyButton';
import type { LoyaltyEntry } from '@/lib/types';

const TYPE_BADGES: Record<LoyaltyEntry['type'], { label: string; color: string }> = {
  earned:         { label: 'Earned',         color: 'bg-green-100 text-green-700' },
  redeemed:       { label: 'Redeemed',       color: 'bg-orange-100 text-orange-700' },
  referral_bonus: { label: 'Referral Bonus', color: 'bg-purple-100 text-purple-700' },
};

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  points:       number;
  history:      LoyaltyEntry[];
  referralCode: string;
}

export default function LoyaltyClient({ points, history, referralCode }: Props) {
  const referralUrl = `https://alfonex.com/login?ref=${referralCode}`;

  return (
    <div className="page-wrapper">
      <h1 className="mb-5 font-heading text-xl font-bold dark:text-gray-100">Loyalty & Rewards</h1>

      {/* Points card */}
      <div className="card mb-4 bg-gradient-to-br from-primary-500 to-primary-700 p-6 text-white">
        <p className="text-sm font-medium opacity-80">Your Points Balance</p>
        <p className="mt-1 font-heading text-5xl font-bold">{points.toLocaleString()}</p>
        <p className="mt-2 text-xs opacity-70">100 points = AED 1 off your next order</p>
      </div>

      {/* How to earn */}
      <div className="card mb-4 p-4">
        <p className="mb-3 font-semibold dark:text-gray-100">How to Earn Points</p>
        <div className="flex flex-col gap-2.5 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-3">
            <i className="fa fa-shopping-bag w-5 text-center text-primary-500" />
            <span>Earn <strong>1 point per AED 10</strong> spent on every order</span>
          </div>
          <div className="flex items-center gap-3">
            <i className="fa fa-user-plus w-5 text-center text-purple-500" />
            <span>Earn <strong>50 bonus points</strong> when a friend places their first order using your referral link</span>
          </div>
        </div>
      </div>

      {/* Referral card */}
      <div className="card mb-4 p-4">
        <p className="mb-1 font-semibold dark:text-gray-100">Your Referral Code</p>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Share your link — you earn 50 points when a friend registers and places their first order.
        </p>
        <div className="mb-3 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800">
          <p className="font-mono text-lg font-bold tracking-widest text-primary-600 dark:text-primary-400">
            {referralCode}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-400">{referralUrl}</p>
        </div>
        <ReferralCopyButton url={referralUrl} />
      </div>

      {/* History */}
      <div className="card p-4">
        <p className="mb-3 font-semibold dark:text-gray-100">Points History</p>
        {history.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            <i className="fa fa-star mb-2 block text-3xl opacity-30" />
            No points activity yet
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
            {history.map((entry) => {
              const badge = TYPE_BADGES[entry.type];
              return (
                <div key={entry.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.color}`}>
                      {badge.label}
                    </span>
                    <p className="mt-0.5 text-xs text-gray-400">{fmtDate(entry.createdAt)}</p>
                  </div>
                  <p className={`font-heading text-lg font-bold ${entry.points > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {entry.points > 0 ? '+' : ''}{entry.points}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
