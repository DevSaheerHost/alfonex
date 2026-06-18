import type { Product } from '@/lib/types';

export type SortOption = 'relevance' | 'price-low' | 'price-high' | 'newest' | 'rating';

/** Expand Apple shorthands and separate letter-digit runs for better matching. */
export function normalizeQuery(raw: string): string {
  let q = raw.toLowerCase().trim();

  const aliases: [RegExp, string][] = [
    [/\biphone\s*(\d)/g, 'iphone $1'],
    [/\bios\s*(\d+)/g,   'iphone $1'],
    [/\bip\s*(\d)/g,     'iphone $1'],
    [/\bip\b/g,          'iphone'],
    [/\bmbp\b/g,         'macbook pro'],
    [/\bmba\b/g,         'macbook air'],
    [/\bmb\b/g,          'macbook'],
    [/\bap\b/g,          'airpods'],
    [/\baw\b/g,          'apple watch'],
    [/\bipad\s*(\d)/g,   'ipad $1'],
  ];
  for (const [pattern, replacement] of aliases) q = q.replace(pattern, replacement);

  q = q.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2');
  return q.trim();
}

/** Multi-token scored search. Title matches rank 2x over description/category. */
export function scoreProducts(products: Product[], raw: string): Product[] {
  if (!raw.trim()) return [];
  const tokens = normalizeQuery(raw).split(/\s+/).filter((t) => t.length > 0);
  if (!tokens.length) return [];

  const scored: { p: Product; score: number }[] = [];
  for (const p of products) {
    if (p.isHidden) continue;
    const title = (p.title ?? '').toLowerCase();
    const hay   = `${title} ${p.description ?? ''} ${p.category ?? ''}`.toLowerCase();
    if (!tokens.every((t) => hay.includes(t))) continue;
    const score = tokens.reduce((acc, t) => acc + (title.includes(t) ? 2 : 1), 0);
    scored.push({ p, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.p);
}

/** Apply a sort option to a result list (relevance keeps incoming order). */
export function sortProducts(products: Product[], sort: SortOption): Product[] {
  const base = (p: Product) => p.priceAED ?? p.price ?? 0;
  const time = (p: Product) =>
    typeof p.createdAt === 'number' ? p.createdAt : new Date(p.createdAt ?? 0).getTime();

  const arr = [...products];
  switch (sort) {
    case 'price-low':  return arr.sort((a, b) => base(a) - base(b));
    case 'price-high': return arr.sort((a, b) => base(b) - base(a));
    case 'newest':     return arr.sort((a, b) => time(b) - time(a));
    case 'rating':     return arr.sort((a, b) => (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0));
    default:           return arr; // relevance — preserve score order
  }
}
