'use client';

import Link from 'next/link';
import { useCompare } from '@/contexts/CompareContext';

export default function CompareBar() {
  const { ids, clear } = useCompare();
  if (ids.length < 2) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 flex justify-center px-4 lg:bottom-6">
      <div className="flex items-center gap-3 rounded-2xl bg-gray-900 px-4 py-3 shadow-2xl dark:bg-gray-800">
        <i className="fa fa-scale-balanced text-primary-400" />
        <span className="text-sm font-medium text-white">
          {ids.length} product{ids.length > 1 ? 's' : ''} to compare
        </span>
        <Link
          href="/compare"
          className="rounded-xl bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600 active:scale-95"
        >
          Compare
        </Link>
        <button
          onClick={clear}
          className="text-gray-400 hover:text-white"
          aria-label="Clear comparison"
        >
          <i className="fa fa-xmark text-sm" />
        </button>
      </div>
    </div>
  );
}
