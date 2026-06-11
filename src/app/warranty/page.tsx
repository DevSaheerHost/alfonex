'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { getWarrantyDevice } from '@/actions/warranty';
import type { WarrantyDevice } from '@/lib/types';

const WA = 'https://wa.me/971558347102';

function daysLeft(expire: string): number {
  return Math.ceil((new Date(expire).getTime() - Date.now()) / 86_400_000);
}

function barPct(start: string, expire: string): number {
  const s = new Date(start).getTime();
  const e = new Date(expire).getTime();
  return Math.min(100, Math.max(0, Math.round(((Date.now() - s) / (e - s)) * 100)));
}

function fmt(d?: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${months[parseInt(m) - 1]} ${y}`;
}

function parseBattery(raw?: string): number | null {
  if (!raw) return null;
  const n = parseInt(raw.replace(/[^0-9]/g, ''));
  return isNaN(n) ? null : n;
}

function StatusBadge({ device }: { device: WarrantyDevice }) {
  const { warrantyStatus: s, warrantyExpire } = device;

  if (s === 'active' && warrantyExpire) {
    const d = daysLeft(warrantyExpire);
    return (
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
          <i className="fa fa-shield-halved" /> Warranty Active
        </span>
        <p className="mt-1 text-xs font-semibold text-green-600">{d} day{d === 1 ? '' : 's'} remaining</p>
      </div>
    );
  }
  if (s === 'expired') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-900/40 dark:text-red-400">
        <i className="fa fa-shield-xmark" /> Warranty Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
      <i className="fa fa-circle-question" /> No Warranty Data
    </span>
  );
}

function ResultCard({ device }: { device: WarrantyDevice }) {
  const bh  = parseBattery(device.batteryHealth);
  const pct = device.warrantyStart && device.warrantyExpire
    ? barPct(device.warrantyStart, device.warrantyExpire) : null;
  const isActive  = device.warrantyStatus === 'active';
  const barColor  = isActive ? 'bg-green-500' : 'bg-red-400';
  const headerBg  = isActive
    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-green-200 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800'
    : device.warrantyStatus === 'expired'
    ? 'bg-gradient-to-r from-red-50 to-rose-50 border-b-2 border-red-200 dark:from-red-950/30 dark:to-rose-950/30 dark:border-red-800'
    : 'bg-gray-50 border-b border-gray-200 dark:bg-gray-800/50 dark:border-gray-700';

  const Row = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="flex items-center justify-between py-2.5 text-sm">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-semibold dark:text-gray-200">{value}</span>
      </div>
    ) : null;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className={`p-4 ${headerBg}`}>
        <p className="font-heading text-lg font-black dark:text-gray-100">
          {device.model ?? 'Unknown Device'} {device.storage ?? ''}
        </p>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          {[device.colour, device.version].filter(Boolean).join(' · ')}
        </p>
        <StatusBadge device={device} />
      </div>

      {/* Progress bar */}
      {pct !== null && device.warrantyStart && device.warrantyExpire && (
        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="mb-1.5 flex justify-between text-[10px] text-gray-400">
            <span>Start: {fmt(device.warrantyStart)}</span>
            <span>Expire: {fmt(device.warrantyExpire)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Details */}
      <div className="divide-y divide-gray-100 px-4 dark:divide-gray-800">
        <Row label="IMEI" value={device.imei} />
        {bh !== null && (
          <div className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Battery Health</span>
            <span className={`font-semibold ${bh >= 80 ? 'text-green-600' : bh >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
              {bh}%
            </span>
          </div>
        )}
        <Row label="Warranty Start"   value={fmt(device.warrantyStart)} />
        <Row label="Warranty Expires" value={fmt(device.warrantyExpire)} />
        <Row label="Grade / Version"  value={device.version} />
        <Row label="Sold Date"        value={fmt(device.soldDate)} />
        {device.notes && (
          <div className="py-2.5 text-sm">
            <p className="text-gray-500 dark:text-gray-400">Notes</p>
            <p className="mt-0.5 text-gray-700 dark:text-gray-300">{device.notes}</p>
          </div>
        )}
      </div>

      {/* Claim button */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
        <p className="text-xs text-gray-400">Issue with your device?</p>
        <a
          href={WA}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-xs font-bold text-white"
        >
          <i className="fa-brands fa-whatsapp" /> Claim Warranty
        </a>
      </div>
    </div>
  );
}

function NotFound({ imei }: { imei: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-8 text-center">
      <span className="text-4xl">🔍</span>
      <p className="font-heading text-base font-bold dark:text-gray-100">Device Not Found</p>
      <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">
        No warranty record for IMEI <strong>{imei}</strong>. Check the number or contact support.
      </p>
      <a
        href={WA}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-5 py-2 text-sm font-bold text-white"
      >
        <i className="fa-brands fa-whatsapp" /> Contact Support
      </a>
    </div>
  );
}

export default function WarrantyPage() {
  const [imei, setImei] = useState('');
  const [result, setResult] = useState<WarrantyDevice | null | 'not_found'>(null);
  const [isPending, startTransition] = useTransition();

  const search = () => {
    const clean = imei.replace(/\D/g, '');
    if (clean.length < 15) return;
    startTransition(async () => {
      const data = await getWarrantyDevice(clean);
      setResult(data ?? 'not_found');
    });
  };

  return (
    <div className="page-wrapper">
      <Link href="/profile" className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
        <i className="fa fa-arrow-left" /> Back
      </Link>

      <div className="mb-5 flex items-center gap-2">
        <i className="fa fa-shield-halved text-xl text-primary-500" />
        <h1 className="font-heading text-xl font-bold dark:text-gray-100">Track Warranty</h1>
      </div>

      {/* Search card */}
      <div className="card mb-5 p-4">
        <p className="mb-1 text-sm font-semibold dark:text-gray-100">Check Your Device</p>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Enter your device IMEI number to view warranty status and details.
        </p>
        <div className="flex gap-2">
          <input
            className="input flex-1 font-mono font-semibold tracking-wide"
            type="tel"
            inputMode="numeric"
            maxLength={20}
            placeholder="Enter 15-digit IMEI"
            value={imei}
            onChange={(e) => setImei(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <button
            onClick={search}
            disabled={isPending || imei.replace(/\D/g, '').length < 15}
            className="btn-primary flex-shrink-0 px-5"
          >
            {isPending ? <i className="fa fa-spinner fa-spin" /> : 'Search'}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">Tip: Dial *#06# on your iPhone to get the IMEI.</p>
      </div>

      {/* Result */}
      {result === 'not_found' && <NotFound imei={imei.replace(/\D/g, '')} />}
      {result && result !== 'not_found' && <ResultCard device={result} />}

      {/* Info note */}
      {!result && (
        <div className="card p-4">
          <p className="mb-1 text-xs font-bold dark:text-gray-100">
            <i className="fa fa-shield-halved mr-1 text-primary-500" /> Warranty Coverage
          </p>
          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Warranty covers hardware defects only. Physical damage, water damage, or accidental damage is not covered.
            To claim warranty, contact us with your IMEI and a description of the issue.
          </p>
        </div>
      )}
    </div>
  );
}
