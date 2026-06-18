/**
 * Injects Cloudinary transformation params into a stored delivery URL.
 * Returns the original URL unchanged for non-Cloudinary sources.
 *
 * Usage:
 *   cldUrl(product.imageUrl, 'f_auto,q_auto,w_400')
 *   → https://res.cloudinary.com/.../upload/f_auto,q_auto,w_400/v123/...
 */
export function cldUrl(url: string, transforms = 'f_auto,q_auto'): string {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  // Skip if transforms are already present (anything between /upload/ and the version/public_id)
  if (/\/upload\/[a-z]/.test(url)) return url;
  return url.replace('/upload/', `/upload/${transforms}/`);
}
