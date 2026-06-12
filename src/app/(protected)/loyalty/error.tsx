'use client';

import Link from 'next/link';

export default function LoyaltyError() {
  return (
    <div className="page-wrapper flex flex-col items-center gap-4 py-20 text-center">
      <i className="fa fa-star text-4xl text-gray-200 dark:text-gray-700" />
      <p className="font-semibold text-gray-600 dark:text-gray-300">Couldn't load your rewards</p>
      <p className="text-sm text-gray-400">Please try again in a moment.</p>
      <Link href="/profile" className="btn-primary mt-2">Back to Profile</Link>
    </div>
  );
}
