'use client';

import { useState } from 'react';
import { submitTradeIn } from '@/actions/tradeIn';
import type { TradeInRequest } from '@/actions/tradeIn';

const CONDITIONS = [
  { value: 'excellent', icon: '✨', label: 'Excellent', desc: 'Like new, no scratches' },
  { value: 'good',      icon: '👍', label: 'Good',      desc: 'Minor wear, fully functional' },
  { value: 'fair',      icon: '⚠️', label: 'Fair',      desc: 'Visible scratches, works fine' },
  { value: 'poor',      icon: '💔', label: 'Poor',      desc: 'Cracked / heavy damage' },
] as const;

const STATUS_BADGE: Record<TradeInRequest['status'], { label: string; cls: string }> = {
  pending:  { label: 'Pending review', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  reviewed: { label: 'Under review',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  accepted: { label: 'Accepted',       cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Not accepted',   cls: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

const LBL = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200';

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
    <div className="page-wrapper">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Trade In / Exchange</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Submit your device — we&apos;ll assess and offer a trade value.
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary shrink-0 text-sm">
            <i className="fa fa-plus" /> New Request
          </button>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <i className="fa fa-circle-check mt-0.5 shrink-0" />
          <span>Request submitted! Our team will review your device and contact you shortly.</span>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-5 p-5">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Your Details</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Your Name *</label>
              <input className="input" required placeholder="Full name"
                value={form.customerName} onChange={(e) => set('customerName', e.target.value)} />
            </div>
            <div>
              <label className={LBL}>Phone / WhatsApp *</label>
              <input className="input" required type="tel" placeholder="+971 50 000 0000"
                value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} />
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Device Details</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LBL}>Device Model *</label>
              <input className="input" required placeholder="e.g. iPhone 13 Pro"
                value={form.deviceModel} onChange={(e) => set('deviceModel', e.target.value)} />
            </div>
            <div>
              <label className={LBL}>Storage</label>
              <input className="input" placeholder="e.g. 256 GB"
                value={form.deviceStorage} onChange={(e) => set('deviceStorage', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={LBL}>IMEI / Serial No. <span className="font-normal text-gray-400">(optional)</span></label>
            <input className="input font-mono tracking-wider" maxLength={15} placeholder="15-digit IMEI"
              value={form.imei} onChange={(e) => set('imei', e.target.value)} />
          </div>

          {/* Condition picker */}
          <div>
            <label className={LBL}>Condition *</label>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map((c) => {
                const active = form.deviceCondition === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => set('deviceCondition', c.value)}
                    className={`relative flex flex-col gap-0.5 rounded-xl border-2 p-3 text-left transition ${
                      active
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 bg-white hover:border-primary-300 dark:border-gray-700 dark:bg-dark-surface'
                    }`}
                  >
                    {active && (
                      <i className="fa fa-circle-check absolute right-2 top-2 text-xs text-primary-500" />
                    )}
                    <span className="text-lg leading-none">{c.icon}</span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{c.label}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{c.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accessories */}
          <div>
            <label className={LBL}>Accessories included</label>
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'hasCharger' as const, icon: 'fa-plug',  label: 'Charger' },
                { key: 'hasBox'     as const, icon: 'fa-box',   label: 'Original box' },
              ]).map(({ key, icon, label }) => {
                const on = form[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set(key, !on)}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                      on
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                        : 'border-gray-200 text-gray-600 hover:border-primary-300 dark:border-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <i className={`fa ${icon} text-xs ${on ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}`} />
                    {label}
                    {on && <i className="fa fa-check text-[10px] text-primary-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          <div>
            <label className={LBL}>Desired upgrade <span className="font-normal text-gray-400">(optional)</span></label>
            <input className="input" placeholder="e.g. iPhone 15 Pro, any model"
              value={form.desiredProduct} onChange={(e) => set('desiredProduct', e.target.value)} />
          </div>

          <div>
            <label className={LBL}>Additional notes <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea className="input min-h-[80px] resize-none" rows={3}
              placeholder="Any other details about the device…"
              value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading
                ? <><i className="fa fa-spinner fa-spin" /> Submitting…</>
                : <><i className="fa fa-paper-plane" /> Submit Trade-In Request</>
              }
            </button>
            {requests.length > 0 && (
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* Request history */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Your Requests</p>
          {requests.map((r) => {
            const badge = STATUS_BADGE[r.status];
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{r.deviceModel}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {r.deviceStorage && `${r.deviceStorage} · `}
                      {r.deviceCondition} condition
                      {r.imei && ` · IMEI ${r.imei}`}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                {r.desiredProduct && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <i className="fa fa-arrow-right mr-1 text-primary-500 text-[10px]" />
                    Wants: {r.desiredProduct}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                  <i className="fa fa-clock mr-1" />
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
