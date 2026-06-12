'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 active:scale-95"
    >
      <i className="fa fa-print" />
      Print / Save as PDF
    </button>
  );
}
