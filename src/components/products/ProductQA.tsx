'use client';

import { useState, useEffect } from 'react';
import { useAuth }             from '@/contexts/AuthContext';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getFirebaseApp }           from '@/lib/firebase/client';
import { askQuestion }         from '@/actions/qa';
import type { QAItem }         from '@/actions/qa';

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  productId: string;
}

export default function ProductQA({ productId }: Props) {
  const { user } = useAuth();
  const [items, setItems]       = useState<QAItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Real-time RTDB listener — updates immediately when admin answers
  useEffect(() => {
    const db       = getDatabase(getFirebaseApp());
    const qaRef    = ref(db, `product_qa/${productId}`);
    const unsub    = onValue(qaRef, (snap) => {
      if (!snap.exists()) { setItems([]); setLoading(false); return; }
      const list: QAItem[] = [];
      snap.forEach((child) => {
        list.push({ id: child.key!, productId, ...child.val() });
      });
      // Newest first
      list.sort((a, b) => b.askedAt - a.askedAt);
      setItems(list);
      setLoading(false);
    }, () => { setLoading(false); }); // on error just stop loading
    return () => unsub();
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const q = question.trim();
    if (!q) return;
    setSubmitting(true);
    try {
      await askQuestion(productId, q);
      // Real-time listener will add it automatically
      setSuccess(true);
      setQuestion('');
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit question');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          Questions &amp; Answers
          {items.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">({items.length})</span>
          )}
        </h2>
        {user && !showForm && (
          <button
            onClick={() => { setShowForm(true); setSuccess(false); }}
            className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            + Ask a question
          </button>
        )}
      </div>

      {/* Ask form */}
      {user && showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
            Your question
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Does this come with original box?"
            rows={3}
            maxLength={400}
            className="input mb-3 min-h-[80px] resize-none text-sm"
          />
          {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting || !question.trim()}
              className="btn-primary btn-sm"
            >
              {submitting ? 'Submitting…' : 'Submit Question'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setQuestion(''); setError(''); }}
              className="btn-secondary btn-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          <i className="fa fa-circle-check mr-1.5" />
          Your question has been submitted. We'll answer it shortly.
        </div>
      )}

      {!user && (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          <a href="/login" className="font-medium text-primary-600 hover:underline dark:text-primary-400">Sign in</a> to ask a question.
        </p>
      )}

      {/* Q&A list */}
      {loading ? (
        <div className="py-6 text-center text-sm text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center dark:border-gray-700">
          <i className="fa fa-circle-question text-2xl text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-400">No questions yet. Be the first to ask!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => (
            <div key={item.id} className="py-4">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">Q</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.question}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {item.askedByName} · {fmtDate(item.askedAt)}
                  </p>
                </div>
              </div>
              {item.answer ? (
                <div className="ml-8 mt-2 flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">A</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-200">{item.answer}</p>
                    {item.answeredAt && (
                      <p className="mt-0.5 text-[11px] text-gray-400">Alfonex · {fmtDate(item.answeredAt)}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="ml-8 mt-2">
                  <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    Awaiting answer
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
