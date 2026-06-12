import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Alfonex',
  description: 'Alfonex is your trusted electronics partner, specializing in premium Apple devices — iPhones, MacBooks, AirPods, Apple Watches and accessories.',
};

const WHY_US = [
  {
    icon: 'fa-certificate',
    label: 'Quality Graded',
    value: 'Every device is graded A1+, A2+, or A3+ — fully inspected before listing.',
  },
  {
    icon: 'fa-shield-halved',
    label: 'Warranty Covered',
    value: 'All products come with a warranty period. Track it anytime in the app.',
  },
  {
    icon: 'fa-truck-fast',
    label: 'Fast Delivery',
    value: 'We ship across UAE, India, and internationally with real-time tracking.',
  },
  {
    icon: 'fa-hand-holding-dollar',
    label: 'Best Prices',
    value: 'Competitive pricing across USD, AED, and INR with no hidden charges.',
  },
  {
    icon: 'fa-headset',
    label: 'Dedicated Support',
    value: 'Reach us on WhatsApp for instant help before or after your purchase.',
  },
  {
    icon: 'fa-rotate-left',
    label: 'Easy Returns',
    value: 'Hassle-free return process if something is not right with your order.',
  },
];

const CATEGORIES = [
  { icon: 'fa-mobile-screen', label: 'iPhone',       desc: 'Latest & previous gen models, all grades' },
  { icon: 'fa-laptop',        label: 'MacBook',      desc: 'Air & Pro models, M-chip & Intel' },
  { icon: 'fa-tablet-screen-button', label: 'iPad', desc: 'iPad Pro, Air, Mini, and standard' },
  { icon: 'fa-headphones',    label: 'AirPods',      desc: 'AirPods, AirPods Pro, Max' },
  { icon: 'fa-clock',         label: 'Apple Watch',  desc: 'Series & Ultra, all sizes' },
  { icon: 'fa-plug',          label: 'Accessories',  desc: 'Cases, chargers, cables & more' },
];

export default function AboutPage() {
  return (
    <div className="page-wrapper max-w-2xl mx-auto">

      {/* Back */}
      <Link href="/" className="mb-5 flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
        <i className="fa fa-arrow-left" /> Back
      </Link>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 px-6 py-8 text-white">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest opacity-70">Your Electronics Partner</p>
        <h1 className="font-heading text-3xl font-extrabold leading-tight">
          Alf<span className="text-white/70">o</span>nex
        </h1>
        <p className="mt-3 text-sm leading-relaxed opacity-85">
          Specializing in premium Apple devices — iPhones, MacBooks, AirPods,
          Apple Watches and accessories. Trusted by hundreds of customers across
          UAE, India, and beyond.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {['UAE 🇦🇪', 'India 🇮🇳', 'International 🌍'].map((tag) => (
            <span key={tag} className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Who We Are ───────────────────────────────────────────────────── */}
      <div className="card mb-5 p-5">
        <p className="mb-3 font-heading text-base font-bold dark:text-gray-100">Who We Are</p>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          Alfonex is a trusted premium electronics retailer focused exclusively on Apple products.
          We source high-quality devices — both brand new and certified pre-owned — and grade
          every item honestly so you always know exactly what you're getting.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          Whether you're upgrading your iPhone, picking up a MacBook for work, or gifting someone
          an Apple Watch, we make it easy, affordable, and reliable. Every order is carefully
          packed and shipped with tracking so you can follow it every step of the way.
        </p>
      </div>

      {/* ── Why Choose Alfonex ───────────────────────────────────────────── */}
      <div className="card mb-5 p-5">
        <p className="mb-4 font-heading text-base font-bold dark:text-gray-100">Why Choose Alfonex</p>
        <ul className="space-y-4">
          {WHY_US.map((item) => (
            <li key={item.label} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
                <i className={`fa-solid ${item.icon} text-sm text-primary-500`} />
              </span>
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">{item.label}</p>
                <p className="text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">{item.value}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Our Collection ───────────────────────────────────────────────── */}
      <div className="card mb-5 p-5">
        <p className="mb-4 font-heading text-base font-bold dark:text-gray-100">Our Collection</p>
        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.label} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-800">
                <i className={`fa-solid ${cat.icon} text-sm text-primary-500`} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-100">{cat.label}</p>
                <p className="mt-0.5 text-[10px] leading-tight text-gray-500 dark:text-gray-400">{cat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quality Grades ───────────────────────────────────────────────── */}
      <div className="card mb-5 p-5">
        <p className="mb-4 font-heading text-base font-bold dark:text-gray-100">Our Quality Grades</p>
        <div className="space-y-3">
          {[
            { grade: 'A1+', label: 'Excellent',  color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  desc: 'Like new — sealed or minimal use. No visible marks.' },
            { grade: 'A2+', label: 'Very Good',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',    desc: 'Light signs of use. Fully functional, minor cosmetic wear.' },
            { grade: 'A3+', label: 'Good',       color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', desc: 'Visible wear on body. Works perfectly, priced to value.' },
          ].map((g) => (
            <div key={g.grade} className="flex items-start gap-3">
              <span className={`mt-0.5 flex-shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${g.color}`}>{g.grade}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{g.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <div className="card mb-6 p-5">
        <p className="mb-4 font-heading text-base font-bold dark:text-gray-100">Get in Touch</p>
        <div className="space-y-3">
          {[
            { icon: 'fa-whatsapp fa-brands', label: 'WhatsApp',  value: 'Chat with us instantly', href: 'https://wa.me/971000000000' },
            { icon: 'fa-envelope',           label: 'Email',     value: 'support@alfonex.com',    href: 'mailto:support@alfonex.com' },
            { icon: 'fa-instagram fa-brands',label: 'Instagram', value: '@alfonex',               href: 'https://instagram.com/alfonex' },
          ].map((c) => (
            <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 transition hover:border-primary-200 hover:bg-primary-50 dark:border-gray-800 dark:hover:border-primary-800 dark:hover:bg-primary-900/10">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                <i className={`fa-solid ${c.icon} text-sm text-gray-500`} />
              </span>
              <div>
                <p className="text-xs text-gray-400">{c.label}</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{c.value}</p>
              </div>
              <i className="fa fa-chevron-right ml-auto text-xs text-gray-300 dark:text-gray-600" />
            </a>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Link href="/" className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base">
        <i className="fa fa-store" /> Browse Our Store
      </Link>

    </div>
  );
}
