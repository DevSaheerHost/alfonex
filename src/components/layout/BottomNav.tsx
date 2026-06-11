'use client';

import Link          from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart }   from '@/contexts/CartContext';
import { useAuth }   from '@/contexts/AuthContext';

interface NavItem {
  href:  string;
  icon:  string;
  label: string;
  authRequired?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',         icon: 'fa-home',         label: 'Shop' },
  { href: '/search',   icon: 'fa-search',       label: 'Search' },
  { href: '/cart',     icon: 'fa-shopping-bag', label: 'Cart' },
  { href: '/orders',   icon: 'fa-box',          label: 'Orders', authRequired: true },
  { href: '/profile',  icon: 'fa-circle-user',  label: 'Account' },
];

export default function BottomNav() {
  const pathname         = usePathname();
  const { totalQty }     = useCart();
  const { user }         = useAuth();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white dark:border-dark-border dark:bg-dark-bg">
      <div className="mx-auto flex max-w-2xl items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const href   = item.authRequired && !user ? '/login' : item.href;

          return (
            <Link
              key={item.href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 px-5 py-2.5 text-[10px] font-medium transition
                ${active
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
              <div className="relative">
                <i className={`fa ${item.icon} text-[18px]`} />
                {item.href === '/cart' && totalQty > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[9px] font-bold text-white">
                    {totalQty > 9 ? '9+' : totalQty}
                  </span>
                )}
              </div>
              {item.label}
              {active && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
