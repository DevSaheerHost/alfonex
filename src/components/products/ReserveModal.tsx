'use client';

import { useState, useTransition, useEffect } from 'react';
import Image from 'next/image';
import { createReservation } from '@/actions/reservations';
import { useAuth }  from '@/contexts/AuthContext';
import { useApp }   from '@/contexts/AppContext';
import { CURRENCY_SYMBOLS } from '@/lib/types';
import type { Product } from '@/lib/types';

interface Props {
  product:      Product;
  price:        number;
  variantLabel: string;
  open:         boolean;
  onClose:      () => void;
}

export default function ReserveModal({ product, price, variantLabel, open, onClose }: Props) {
  const { user }    = useAuth();
  const { currency } = useApp();
  const symbol      = CURRENCY_SYMBOLS[currency];

  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [advance, setAdvance] = useState('');
  const [note,    setNote]    = useState('');
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');
  const [isPending, startTransition] = useTransition();

  // Pre-fill name from auth
  useEffect(() => {
    if (open) {
      setName(user?.displayName ?? '');
      setPhone('');
      setAdvance('');
      setNote('');
      setDone(false);
      setError('');
    }
  }, [open, user]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleSubmit = () => {
    if (!name.trim())  { setError('Please enter your name.');         return; }
    if (!phone.trim()) { setError('Please enter your phone number.'); return; }
    setError('');

    startTransition(async () => {
      try {
        await createReservation({
          productId:     product.id,
          productTitle:  product.title,
          productImage:  product.imageUrl,
          variantLabel:  variantLabel,
          price,
          currency,
          advance:       parseFloat(advance) || 0,
          customerName:  name.trim(),
          customerPhone: phone.trim(),
          note:          note.trim(),
          userId:        user?.uid ?? 'guest',
        });
        setDone(true);
      } catch {
        setError('Something went wrong. Please try again.');
      }
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg animate-slide-up rounded-t-3xl bg-white px-5 pb-10 pt-5 dark:bg-dark-surface">

        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />

        {done ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="text-5xl">🎉</span>
            <p className="font-heading text-lg font-black dark:text-gray-100">Reservation Confirmed!</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              We&apos;ll contact you on <strong>{phone}</strong> to confirm the details.
            </p>
            <button onClick={onClose} className="btn-primary mt-3 w-full">Done</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-heading text-lg font-black dark:text-gray-100">Reserve Device</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Book now — we&apos;ll contact you when it&apos;s ready.
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <i className="fa fa-xmark text-lg" />
              </button>
            </div>

            {/* Product strip */}
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-white dark:bg-gray-800">
                <Image src={product.imageUrl} alt={product.title} fill className="object-contain p-1" sizes="56px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold dark:text-gray-100">{product.title}</p>
                {variantLabel && <p className="text-xs text-gray-400">{variantLabel}</p>}
                <p className="text-sm font-bold text-primary-600">{symbol}{price.toLocaleString()}</p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </p>
            )}

            {/* Form */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Your Name *
                </label>
                <input className="input" placeholder="Full name" value={name}
                  onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  WhatsApp / Phone *
                </label>
                <input className="input" type="tel" inputMode="tel"
                  placeholder="+91 99999 99999" value={phone}
                  onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Advance Amount ({currency.toUpperCase()}) — optional
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                    {symbol}
                  </span>
                  <input className="input pl-8" type="number" min="0" inputMode="numeric"
                    placeholder="0" value={advance}
                    onChange={(e) => setAdvance(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Note — optional
                </label>
                <input className="input" placeholder="e.g. Preferred colour, delivery city…"
                  value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="btn-primary mt-1 w-full"
              >
                {isPending
                  ? <><i className="fa fa-spinner fa-spin" /> Reserving…</>
                  : <><i className="fa fa-bookmark" /> Confirm Reservation</>}
              </button>
              <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
