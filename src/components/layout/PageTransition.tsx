'use client';

import { usePathname } from 'next/navigation';

// Strip the variant slug from product URLs so the key stays stable
// across colour/variant changes:  /products/{slug}/p/{id} → /products/p/{id}
function stableKey(pathname: string): string {
  const match = pathname.match(/^(\/products\/)([^/]+)(\/p\/.+)$/);
  if (match) return match[1] + match[3];
  return pathname;
}

// Product detail pages get the bottom-to-top sheet entrance;
// every other page gets the lighter fade+lift.
function animationClass(pathname: string): string {
  return /^\/products\/[^/]+\/p\//.test(pathname)
    ? 'animate-sheet-enter'
    : 'animate-page-enter';
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={stableKey(pathname)} className={animationClass(pathname)}>
      {children}
    </div>
  );
}
