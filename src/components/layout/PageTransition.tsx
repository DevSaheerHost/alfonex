'use client';

import { usePathname } from 'next/navigation';

// Strip the variant slug from product URLs so colour/variant changes
// don't change the key and replay the enter animation.
// /products/{slug}/p/{id}  →  /products/p/{id}
function stableKey(pathname: string): string {
  const match = pathname.match(/^(\/products\/)([^/]+)(\/p\/.+)$/);
  if (match) return match[1] + match[3];
  return pathname;
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={stableKey(pathname)} className="animate-page-enter">
      {children}
    </div>
  );
}
