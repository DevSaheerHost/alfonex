'use client';

import { usePathname } from 'next/navigation';

// Strip the variant slug from product URLs so the key stays stable
// across colour/variant changes:  /{slug}/p/{id} → /p/{id}
function stableKey(pathname: string): string {
  const m = pathname.match(/^\/[^/]+\/p\/(.+)$/);
  if (m) return `/p/${m[1]}`;
  return pathname;
}

// Product detail pages get the bottom-to-top sheet entrance;
// every other page gets the lighter fade+lift.
function animationClass(pathname: string): string {
  return /^\/[^/]+\/p\//.test(pathname)
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
