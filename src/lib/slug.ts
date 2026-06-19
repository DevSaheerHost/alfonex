import type { Product } from '@/lib/types';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// Base product URL — no variant info (used by ProductCard, search results, etc.)
export function productHref(product: { id: string; title: string }): string {
  return `/${slugify(product.title)}/p/${product.id}`;
}

// Variant-aware URL — colour and storage attributes appended to the slug.
// Follows the product's variant group order so slugs are always deterministic.
// e.g. variantHref(product, { Color: "Silver", Storage: "256GB" })
//   → /iphone-17-pro-silver-256gb/p/-OuWQ...
export function variantHref(
  product: { id: string; title: string; variants?: Array<{ name: string }> },
  selectedVariants: Record<string, string>,
): string {
  const attrPart = (product.variants ?? [])
    .map((g) => selectedVariants[g.name])
    .filter(Boolean)
    .map(slugify)
    .join('-');
  const slug = attrPart ? `${slugify(product.title)}-${attrPart}` : slugify(product.title);
  return `/${slug}/p/${product.id}`;
}

// Recovers { Color: "Silver", Storage: "256GB" } from a variant slug.
// Tries the product's variantSlugs index first (O(1)), falls back to
// token-matching when the index hasn't been generated yet.
export function parseVariantsFromSlug(
  slug: string,
  product: Product,
): Record<string, string> {
  const baseSlug = slugify(product.title);
  const suffix   = slug.startsWith(baseSlug + '-') ? slug.slice(baseSlug.length + 1) : '';
  if (!suffix) return {};

  // Fast path — admin-generated index
  if (product.variantSlugs?.[suffix]) {
    return product.variantSlugs[suffix];
  }

  // Slow path — match slugified variant labels against the suffix tokens
  const result: Record<string, string> = {};
  for (const group of product.variants ?? []) {
    for (const v of group.values) {
      if (suffix.includes(slugify(v.label))) {
        result[group.name] = v.label;
        break;
      }
    }
  }
  return result;
}
