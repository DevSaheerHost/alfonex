import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider }  from '@/contexts/AuthContext';
import { CartProvider }  from '@/contexts/CartContext';
import { AppProvider }   from '@/contexts/AppContext';
import Header            from '@/components/layout/Header';
import BottomNav         from '@/components/layout/BottomNav';

export const metadata: Metadata = {
  title:       'Alfonex — Genuine Apple Devices',
  description: 'Buy and sell genuine Apple devices — iPhones, MacBooks, AirPods and more. Multi-currency support: USD, AED, INR.',
  keywords:    ['apple', 'iphone', 'macbook', 'airpods', 'apple watch', 'refurbished', 'genuine'],
  openGraph: {
    title:       'Alfonex — Genuine Apple Devices',
    description: 'Buy and sell genuine Apple devices.',
    siteName:    'Alfonex',
    type:        'website',
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
              <div className="min-h-screen bg-gray-100 dark:bg-[#111]">
                <Header />
                <main className="pb-20">
                  {children}
                </main>
                <BottomNav />
              </div>
            </CartProvider>
          </AuthProvider>
        </AppProvider>
      </body>
    </html>
  );
}
