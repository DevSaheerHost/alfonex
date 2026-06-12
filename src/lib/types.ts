// ─── Currency ──────────────────────────────────────────────────────────────────

export type Currency = 'usd' | 'aed' | 'inr';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  usd: '$',
  aed: 'AED ',
  inr: '₹',
};

// ─── Product ──────────────────────────────────────────────────────────────────

export interface VariantValue {
  label: string;
  stock: number;
}

export interface VariantGroup {
  name: string;
  values: VariantValue[];
}

export type ProductGrade = 'a1+' | 'a2+' | 'a3+';

export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  price: number;
  priceUSD?: number;
  priceAED?: number;
  priceINR?: number;
  costPrice: number;
  stock: number;
  grade: ProductGrade;
  variants: VariantGroup[];
  isFeatured: boolean;
  isNewArrival: boolean;
  isOnSale: boolean;
  isComingSoon: boolean;
  isOOS: boolean;
  isHidden: boolean;
  createdAt: string;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  costPrice: number;
  imageUrl: string;
  qty: number;
  variantLabel: string;
  grade?: ProductGrade;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'Pending'
  | 'Packed'
  | 'Dispatched'
  | 'Shipped'
  | 'In Transit'
  | 'Delivered';

export type PaymentStatus = 'Unpaid' | 'Paid';

export type PayMethod =
  | 'cod'
  | 'card'
  | 'apple_pay'
  | 'tabby'
  | 'tamara';

export interface OrderItem {
  productId: string;
  title: string;
  variantLabel: string;
  qty: number;
  unitPrice: number;
  costPrice: number;
  lineTotal: number;
  grade?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerCountry: string;
  customerState: string;
  customerDistrict: string;
  customerPlace: string;
  userId: string;
  userEmail: string;
  items: OrderItem[];
  cost: number;
  shipping: number;
  total: number;
  profit: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  payMethod: PayMethod;
  currency: Currency;
  notes: string;
  courier: string;
  trackingNo: string;
  createdAt: string;
  updatedAt: string;
  packed_at?: string;
  dispatched_at?: string;
  shipped_at?: string;
  transit_at?: string;
  delivered_at?: string;
}

// ─── Address ──────────────────────────────────────────────────────────────────

export interface Address {
  id: string;
  name: string;
  phone: string;
  country: string;
  state: string;
  district: string;
  place: string;
  primary: boolean;
}

// ─── Banner ───────────────────────────────────────────────────────────────────

export type BannerAction =
  | 'product'
  | 'category'
  | 'new_arrivals'
  | 'featured'
  | 'browse_all';

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  actionType: BannerAction;
  productId?: string;
  category?: string;
  gradient: string;
  badge: string;
  btnLabel: string;
  active: boolean;
  order: number;
}

// ─── Reservation ──────────────────────────────────────────────────────────────

export interface Reservation {
  productId:     string;
  productTitle:  string;
  productImage:  string;
  variantLabel:  string;
  price:         number;
  currency:      string;
  advance:       number;
  customerName:  string;
  customerPhone: string;
  note:          string;
  status:        'pending' | 'confirmed' | 'cancelled';
  userId:        string;
  createdAt:     number;
}

// ─── Warranty ─────────────────────────────────────────────────────────────────

export type WarrantyStatus = 'active' | 'expired' | 'unknown';

export interface WarrantyDevice {
  imei:           string;
  model?:         string;
  storage?:       string;
  colour?:        string;
  version?:       string;
  batteryHealth?: string;
  warrantyStatus: WarrantyStatus;
  warrantyStart?:  string;
  warrantyExpire?: string;
  soldDate?:       string;
  notes?:          string;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  whatsapp: string;
  createdAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'order_placed' | 'order_status' | 'general';
  orderId?: string;
  read: boolean;
  createdAt: number;
}

// ─── Loyalty ──────────────────────────────────────────────────────────────────

export interface LoyaltyEntry {
  id:        string;
  points:    number;
  type:      'earned' | 'redeemed' | 'referral_bonus';
  orderId?:  string;
  createdAt: number;
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface CheckoutFormData {
  name: string;
  phone: string;
  country: string;
  state: string;
  district: string;
  place: string;
  notes: string;
  payMethod: PayMethod;
}
