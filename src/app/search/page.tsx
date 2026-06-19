import type { Metadata } from 'next';
import Link from 'next/link';
import { getProducts } from '@/actions/products';
import { scoreProducts, sortProducts, type SortOption } from '@/lib/search';
import ProductCard from '@/components/products/ProductCard';
import SearchBar from './SearchBar';
import SearchToolbar from './SearchToolbar';
import type { Product } from '@/lib/types';

const POPULAR = ['iPhone 15', 'MacBook Air', 'AirPods Pro', 'Apple Watch', 'iPad'];

export const metadata: Metadata = { title: 'Search — Alfonex' };

interface Props {
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const sp   = await searchParams;
  const q    = (sp.q ?? '').trim();
  const sort = (sp.sort ?? 'relevance') as SortOption;

  let results: Product[] = [];
  if (q) {
    const all = await getProducts();
    results = sortProducts(scoreProducts(all, q), sort);
  }

  return (
    <div className="page-wrapper">
      <SearchBar initialQuery={q} />

      {/* No query — landing prompt */}
      {!q && (
        <div className="py-10 text-center">
          <i className="fa fa-magnifying-glass mb-3 text-4xl text-gray-300 dark:text-gray-600" />
          <p className="font-medium text-gray-700 dark:text-gray-200">Find your next Apple device</p>
          <p className="mt-1 text-sm text-gray-400">Search by model, e.g. &quot;iPhone 15 Pro&quot;</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {POPULAR.map((s) => (
              <Link
                key={s}
                href={`/search?q=${encodeURIComponent(s)}`}
                className="rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-primary-50 hover:text-primary-600 dark:bg-dark-surface dark:text-gray-300"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Query with no results */}
      {q && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
          <i className="fa fa-magnifying-glass text-3xl" />
          <p className="text-sm">No results for &quot;{q}&quot;</p>
          <Link href="/" className="mt-2 text-xs font-medium text-primary-500">Browse all products</Link>
        </div>
      )}

      {/* Results */}
      {q && results.length > 0 && (
        <>
          <SearchToolbar query={q} sort={sort} count={results.length} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {results.map((p, i) => (
              <ProductCard key={p.id} product={p} searchQuery={q} sourceRef="search" position={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
