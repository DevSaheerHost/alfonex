import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider }  from '@/contexts/AuthContext';
import { CartProvider }  from '@/contexts/CartContext';
import { AppProvider }   from '@/contexts/AppContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { CompareProvider }  from '@/contexts/CompareContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import Header            from '@/components/layout/Header';
import BottomNav         from '@/components/layout/BottomNav';
import SideNav           from '@/components/layout/SideNav';
import PageTransition    from '@/components/layout/PageTransition';
import CompareBar        from '@/components/products/CompareBar';

export const metadata: Metadata = {
  metadataBase: new URL('https://alfonex.com'),
  title: {
    default:  'Alfonex — Genuine Apple Devices',
    template: '%s — Alfonex',
  },
  description: 'Buy genuine Apple devices at Alfonex — iPhones, MacBooks, AirPods, Apple Watch. Available in USD, AED & INR. Ships to UAE, India, Saudi Arabia and more.',
  keywords:    ['apple', 'iphone', 'macbook', 'airpods', 'apple watch', 'genuine apple', 'refurbished', 'UAE', 'India', 'AED', 'buy iphone'],
  authors:     [{ name: 'Alfonex', url: 'https://alfonex.com' }],
  openGraph: {
    title:       'Alfonex — Genuine Apple Devices',
    description: 'Buy genuine Apple devices — iPhones, MacBooks, AirPods and more. Ships to UAE, India & GCC.',
    siteName:    'Alfonex',
    type:        'website',
    url:         'https://alfonex.com',
    images: [{
      url:    '/assets/meta/icon/logo.png',
      width:  512,
      height: 512,
      alt:    'Alfonex — Genuine Apple Devices',
    }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Alfonex — Genuine Apple Devices',
    description: 'Buy genuine Apple devices — iPhones, MacBooks, AirPods and more.',
    images:      ['/assets/meta/icon/logo.png'],
  },
  icons: {
    icon:  '/assets/meta/icon/logo.png',
    apple: '/assets/meta/icon/logo.png',
  },
  alternates: {
    canonical: 'https://alfonex.com',
  },
};

export const viewport: Viewport = {
  width:            'device-width',
  initialScale:     1,
  themeColor:       '#2EA056',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
        <link rel="icon" href="/assets/meta/icon/logo.png" />
      </head>
      <body>
        <AppProvider>
          <AuthProvider>
            <CartProvider>
            <WishlistProvider>
            <CompareProvider>
            <NotificationsProvider>
              <div className="min-h-screen bg-gray-100 dark:bg-[#111]">
                <Header />
                <div className="mx-auto max-w-6xl lg:flex lg:gap-6 lg:px-6 lg:pt-4">
                  <SideNav />
                  <main className="min-w-0 flex-1 pb-20 lg:pb-10">
                    <PageTransition>{children}</PageTransition>
                  </main>
                </div>
                <BottomNav />
                <CompareBar />
              </div>
            </NotificationsProvider>
            </CompareProvider>
            </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}
