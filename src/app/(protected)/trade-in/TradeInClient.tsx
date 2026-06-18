'use client';

import { useState } from 'react';
import { submitTradeIn } from '@/actions/tradeIn';
import type { TradeInRequest } from '@/actions/tradeIn';

const CONDITIONS = [
  { value: 'excellent', label: 'Excellent', desc: 'Like new, no scratches' },
  { value: 'good',      label: 'Good',      desc: 'Minor wear, fully functional' },
  { value: 'fair',      label: 'Fair',      desc: 'Visible scratches, works fine' },
  { value: 'poor',      label: 'Poor',      desc: 'Cracked / heavy damage' },
] as const;

const STATUS_BADGE: Record<TradeInRequest['status'], { label: string; cls: string }> = {
  pending:  { label: 'Pending review', cls: 'bg-yellow-100 text-yellow-700' },
  reviewed: { label: 'Under review',   cls: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepted',       cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Not accepted',   cls: 'bg-red-100 text-red-600' },
};

interface Props { requests: TradeInRequest[] }

export default function TradeInClient({ requests: initial }: Props) {
  const [requests, setRequests] = useState(initial);
  const [showForm, setShowForm] = useState(requests.length === 0);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);

  const [form, setForm] = useState({
    customerName:    '',
    customerPhone:   '',
    deviceModel:     '',
    deviceStorage:   '',
    deviceCondition: 'good' as TradeInRequest['deviceCondition'],
    hasCharger:      false,
    hasBox:          false,
    imei:            '',
    notes:           '',
    desiredProduct:  '',
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitTradeIn(form);
      setSuccess(true);
      setShowForm(false);
      // Optimistically add to list
      setRequests((prev) => [{
        ...form,
        id: String(Date.now()),
        uid: '',
        status: 'pending',
        createdAt: Date.now(),
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold dark:text-white">Trade In / Exchange</h1>
          <p className="text-sm text-gray-500">Submit your device — we&apos;ll assess and offer a trade value.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            <i className="fa fa-plus mr-1" />New Request
          </button>
        )}
      </div>

      {success && (
        <div className="mb-4 rounded-2xl bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <i className="fa fa-check-circle mr-2" />
          Request submitted! Our team will review and contact you shortly.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4 p-4">
          <h2 className="font-semibold dark:text-white">Device Details</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mf-label">Your Name *</label>
              <input className="mf-input" required value={form.customerName}
                onChange={(e) => set('customerName', e.target.value)} />
            </div>
            <div>
              <label className="mf-label">Phone / WhatsApp *</label>
              <input className="mf-input" required value={form.customerPhone} type="tel"
                onChange={(e) => set('customerPhone', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mf-label">Device Model *</label>
              <input className="mf-input" required placeholder="e.g. iPhone 13 Pro"
                value={form.deviceModel} onChange={(e) => set('deviceModel', e.target.value)} />
            </div>
            <div>
              <label className="mf-label">Storage</label>
              <input className="mf-input" placeholder="e.g. 256GB"
                value={form.deviceStorage} onChange={(e) => set('deviceStorage', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="mf-label">IMEI / Serial No.</label>
            <input className="mf-input font-mono" maxLength={15} placeholder="15-digit IMEI"
              value={form.imei} onChange={(e) => set('imei', e.target.value)} />
          </div>

          <div>
            <label className="mf-label">Condition *</label>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set('deviceCondition', c.value)}
                  className={`rounded-xl border-2 p-2 text-left text-sm transition ${
                    form.deviceCondition === c.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <span className="font-semibold dark:text-white">{c.label}</span>
                  <br />
                  <span className="text-xs text-gray-500">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm dark:text-gray-200">
              <input type="checkbox" checked={form.hasCharger}
                onChange={(e) => set('hasCharger', e.target.checked)} />
              Includes charger
            </label>
            <label className="flex items-center gap-2 text-sm dark:text-gray-200">
              <input type="checkbox" checked={form.hasBox}
                onChange={(e) => set('hasBox', e.target.checked)} />
              Includes box
            </label>
          </div>

          <div>
            <label className="mf-label">Desired upgrade (optional)</label>
            <input className="mf-input" placeholder="e.g. iPhone 15 Pro, any model"
              value={form.desiredProduct} onChange={(e) => set('desiredProduct', e.target.value)} />
          </div>

          <div>
            <label className="mf-label">Additional notes</label>
            <textarea className="mf-input min-h-[72px] resize-none" rows={3}
              value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <i className="fa fa-spinner fa-spin" /> : 'Submit Trade-In Request'}
            </button>
            {requests.length > 0 && (
              <button type="button" onClick={() => setShowForm(false)}
                className="rounded-xl border border-gray-300 px-4 text-sm dark:border-gray-600 dark:text-gray-300">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {requests.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold dark:text-white">Your Requests</h2>
          {requests.map((r) => {
            const badge = STATUS_BADGE[r.status];
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold dark:text-white">{r.deviceModel}</p>
                    <p className="text-xs text-gray-500">
                      {r.deviceStorage && `${r.deviceStorage} · `}
                      {r.deviceCondition} condition
                      {r.imei && ` · IMEI ${r.imei}`}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                {r.desiredProduct && (
                  <p className="mt-1 text-xs text-gray-500">
                    Wants: {r.desiredProduct}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
