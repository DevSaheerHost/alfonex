'use client';

import { useState } from 'react';
import { submitReturn } from '@/actions/returns';
import type { ReturnRequest, ReturnReason } from '@/actions/returns';

const REASONS: { value: ReturnReason; label: string }[] = [
  { value: 'defective',        label: 'Defective / Not working' },
  { value: 'wrong_item',       label: 'Wrong item received' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'changed_mind',     label: 'Changed my mind' },
  { value: 'other',            label: 'Other' },
];

const STATUS_INFO: Record<ReturnRequest['status'], { label: string; cls: string; icon: string }> = {
  submitted: { label: 'Submitted',     cls: 'bg-yellow-100 text-yellow-700', icon: 'fa-clock' },
  approved:  { label: 'Approved',      cls: 'bg-blue-100 text-blue-700',     icon: 'fa-check' },
  rejected:  { label: 'Rejected',      cls: 'bg-red-100 text-red-600',       icon: 'fa-xmark' },
  received:  { label: 'Item Received', cls: 'bg-purple-100 text-purple-700', icon: 'fa-box' },
  refunded:  { label: 'Refunded',      cls: 'bg-green-100 text-green-700',   icon: 'fa-money-bill' },
  replaced:  { label: 'Replaced',      cls: 'bg-green-100 text-green-700',   icon: 'fa-rotate' },
};

export default function ReturnsClient({ returns: initial }: { returns: ReturnRequest[] }) {
  const [returns,  setReturns]  = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [form, setForm] = useState({
    orderId:     '',
    productName: '',
    reason:      'defective' as ReturnReason,
    description: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitReturn(form);
      setSuccess(true);
      setShowForm(false);
      setReturns((prev) => [{
        ...form,
        id: String(Date.now()),
        uid: '',
        status: 'submitted',
        adminNotes: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold dark:text-white">Returns & RMA</h1>
          <p className="text-sm text-gray-500">Request a return, replacement, or refund.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            <i className="fa fa-plus mr-1" />New Request
          </button>
        )}
      </div>

      {success && (
        <div className="mb-4 rounded-2xl bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          <i className="fa fa-check-circle mr-2" />Return request submitted. We&apos;ll review and contact you within 24 hours.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6 space-y-4 p-4">
          <h2 className="font-semibold dark:text-white">Return Details</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mf-label">Order ID *</label>
              <input className="mf-input font-mono" required placeholder="e.g. last 6 chars"
                value={form.orderId} onChange={(e) => set('orderId', e.target.value)} />
            </div>
            <div>
              <label className="mf-label">Product *</label>
              <input className="mf-input" required placeholder="e.g. iPhone 14 Pro"
                value={form.productName} onChange={(e) => set('productName', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="mf-label">Reason *</label>
            <select className="mf-input" value={form.reason}
              onChange={(e) => set('reason', e.target.value as ReturnReason)}>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mf-label">Describe the issue *</label>
            <textarea className="mf-input min-h-[80px] resize-none" required rows={3}
              value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <i className="fa fa-spinner fa-spin" /> : 'Submit Return Request'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-xl border border-gray-300 px-4 text-sm dark:border-gray-600 dark:text-gray-300">
              Cancel
            </button>
          </div>
        </form>
      )}

      {returns.length === 0 && !showForm ? (
        <div className="py-10 text-center">
          <i className="fa fa-box-open mb-3 text-4xl text-gray-300 dark:text-gray-600" />
          <p className="font-medium dark:text-white">No return requests</p>
          <p className="mt-1 text-sm text-gray-500">If something went wrong with your order, let us know.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">
            Start a Return
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map((r) => {
            const info = STATUS_INFO[r.status];
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold dark:text-white">{r.productName}</p>
                    <p className="text-xs text-gray-500">Order #{r.orderId.slice(-6)} · {REASONS.find((x) => x.value === r.reason)?.label}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${info.cls}`}>
                    <i className={`fa ${info.icon} mr-1`} />{info.label}
                  </span>
                </div>
                {r.description && (
                  <p className="mt-1.5 line-clamp-2 text-xs text-gray-500">{r.description}</p>
                )}
                {r.adminNotes && (
                  <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                    <i className="fa fa-comment mr-1" />{r.adminNotes}
                  </div>
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
