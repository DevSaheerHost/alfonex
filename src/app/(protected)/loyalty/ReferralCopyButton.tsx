'use client';

import { useState } from 'react';

export default function ReferralCopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — select the text
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-300"
    >
      <i className={`fa ${copied ? 'fa-check' : 'fa-copy'}`} />
      {copied ? 'Copied!' : 'Copy Referral Link'}
    </button>
  );
}
