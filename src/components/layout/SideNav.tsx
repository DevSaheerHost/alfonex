'use client';

import Link          from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart }   from '@/contexts/CartContext';
import { useAuth }   from '@/contexts/AuthContext';

const NAV = [
  { href: '/',        icon: 'fa-home',         label: 'Shop' },
  { href: '/search',  icon: 'fa-search',       label: 'Search' },
  { href: '/cart',    icon: 'fa-shopping-bag', label: 'Cart', showBadge: true },
  { href: '/orders',    icon: 'fa-box',          label: 'Orders',    authRequired: true },
  { href: '/loyalty',   icon: 'fa-star',         label: 'Rewards',   authRequired: true },
  { href: '/profile',   icon: 'fa-circle-user',  label: 'Account' },
  { href: '/converter', icon: 'fa-coins',         label: 'Converter' },
  { href: '/about',     icon: 'fa-circle-info',  label: 'About' },
];

export default function SideNav() {
  const pathname     = usePathname();
  const { totalQty } = useCart();
  const { user }     = useAuth();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside className="hidden lg:flex lg:w-52 lg:flex-shrink-0 lg:flex-col">
      <nav className="sticky top-[65px] flex flex-col gap-1 py-2">
        {NAV.map((item) => {
          const active = isActive(item.href);
          const href   = item.authRequired && !user ? '/login' : item.href;
          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition
                ${active
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-surface dark:hover:text-gray-100'}`}
            >
              <i className={`fa ${item.icon} w-4 text-center`} />
              {item.label}
              {item.showBadge && totalQty > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">
                  {totalQty > 9 ? '9+' : totalQty}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
