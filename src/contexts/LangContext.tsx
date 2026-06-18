'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Lang = 'en' | 'ar';

interface LangCtx {
  lang:   Lang;
  dir:    'ltr' | 'rtl';
  toggle: () => void;
  t:      (key: string) => string;
}

// Core translation dictionary
const AR: Record<string, string> = {
  // Navigation
  'Shop':            'المتجر',
  'Search':          'بحث',
  'Cart':            'السلة',
  'Orders':          'الطلبات',
  'Rewards':         'المكافآت',
  'Account':         'الحساب',
  'Converter':       'محوّل العملة',
  'About':           'عن المتجر',
  'Compare':         'مقارنة',
  'Trade In':        'استبدال',
  'Returns':         'المرتجعات',
  'Wishlist':        'المفضلة',
  // Product detail
  'Add to Cart':     'أضف إلى السلة',
  'Reserve':         'حجز',
  'Out of Stock':    'نفدت الكمية',
  'Notify Me When Available': 'أعلمني عند توفره',
  'Remove Alert':    'إلغاء التنبيه',
  'Notify Me if Price Drops': 'أعلمني عند انخفاض السعر',
  'Price Alert On — Tap to Remove': 'تنبيه السعر مفعّل — اضغط للإلغاء',
  'EMI Calculator':  'حاسبة التقسيط',
  'Monthly payment': 'القسط الشهري',
  'Total payable':   'الإجمالي',
  'Total interest':  'الفائدة الإجمالية',
  'Repayment period': 'مدة السداد',
  // Cart
  'Your cart':       'سلتك',
  'Empty cart':      'السلة فارغة',
  'Checkout':        'الدفع',
  'Total':           'الإجمالي',
  // Profile
  'Sign In':         'تسجيل الدخول',
  'Sign Out':        'تسجيل الخروج',
  'My Orders':       'طلباتي',
  'Loyalty & Rewards': 'النقاط والمكافآت',
  // Reviews
  'Write a Review':  'كتابة تقييم',
  'Reviews':         'التقييمات',
  // Trade-in
  'Trade In / Exchange': 'استبدال / مبادلة',
  'Returns & RMA':   'الإرجاع والاستبدال',
  // General
  'New':             'جديد',
  'Sale':            'تخفيض',
  'Featured':        'مميز',
  'Similar Products':'منتجات مشابهة',
  'Picked for You':  'مختار لك',
  'Browse Products': 'تصفح المنتجات',
  'Loading…':        'جارٍ التحميل…',
};

const Ctx = createContext<LangCtx>({
  lang: 'en', dir: 'ltr', toggle: () => {}, t: (k) => k,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    const saved = localStorage.getItem('alfonex_lang') as Lang | null;
    if (saved === 'ar' || saved === 'en') setLang(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const toggle = useCallback(() => {
    setLang((l) => {
      const next = l === 'en' ? 'ar' : 'en';
      localStorage.setItem('alfonex_lang', next);
      return next;
    });
  }, []);

  const t = useCallback((key: string) => {
    if (lang === 'ar' && AR[key]) return AR[key];
    return key;
  }, [lang]);

  return (
    <Ctx.Provider value={{ lang, dir: lang === 'ar' ? 'rtl' : 'ltr', toggle, t }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLang = () => useContext(Ctx);
