'use client';

import { useRouter } from 'next/navigation';
import type { SortOption } from '@/lib/search';

const SORTS: { value: SortOption; label: string }[] = [
  { value: 'relevance',  label: 'Relevance' },
  { value: 'price-low',  label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'rating',     label: 'Top Rated' },
];

interface Props {
  query: string;
  sort:  SortOption;
  count: number;
}

export default function SearchToolbar({ query, sort, count }: Props) {
  const router = useRouter();

  const onSort = (s: string) => {
    const params = new URLSearchParams({ q: query });
    if (s !== 'relevance') params.set('sort', s);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        <span className="font-semibold text-gray-700 dark:text-gray-200">{count}</span>{' '}
        result{count !== 1 ? 's' : ''} for &quot;<span className="font-medium">{query}</span>&quot;
      </p>
      <div className="relative">
        <i className="fa fa-arrow-down-wide-short pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400" />
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value)}
          className="appearance-none rounded-full border border-gray-200 bg-white py-1.5 pl-8 pr-7 text-xs font-medium text-gray-700 focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-dark-surface dark:text-gray-200"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <i className="fa fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-gray-400" />
      </div>
    </div>
  );
}
