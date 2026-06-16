import { getOrder }    from '@/actions/orders';
import { notFound }    from 'next/navigation';
import Link            from 'next/link';
import type { Order, OrderStatus } from '@/lib/types';

const GRADE_LABELS: Record<string, { label: string; color: string }> = {
  'a1+': { label: 'Excellent', color: 'bg-green-100 text-green-700' },
  'a2+': { label: 'Very Good', color: 'bg-blue-100 text-blue-700' },
  'a3+': { label: 'Good',      color: 'bg-yellow-100 text-yellow-700' },
};

const STEPS: OrderStatus[] = [
  'Pending', 'Packed', 'Dispatched', 'Shipped', 'In Transit', 'Delivered',
];

const STEP_ICONS: Record<OrderStatus, string> = {
  Pending:      'fa-clock',
  Packed:       'fa-box',
  Dispatched:   'fa-truck',
  Shipped:      'fa-truck-fast',
  'In Transit': 'fa-plane',
  Delivered:    'fa-circle-check',
};

const STEP_TS: Record<OrderStatus, keyof Order> = {
  Pending:      'createdAt',
  Packed:       'packed_at',
  Dispatched:   'dispatched_at',
  Shipped:      'shipped_at',
  'In Transit': 'transit_at',
  Delivered:    'delivered_at',
};

const COURIER_URLS: Record<string, string> = {
  aramex:       'https://www.aramex.com/us/en/track/results?ShipmentNumber=',
  dhl:          'https://www.dhl.com/en/express/tracking.html?AWB=',
  fedex:        'https://www.fedex.com/fedextrack/?trknbr=',
  'speed post': 'https://www.indiapost.gov.in/_layouts/15/DOP.Portal.Tracking/TrackConsignment.aspx?ConsignmentNo=',
  ups:          'https://www.ups.com/track?tracknum=',
};

function fmtDate(val: string | undefined): string {
  if (!val) return '';
  return new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  let order: Order;

  try {
    order = await getOrder(id);
  } catch {
    notFound();
  }

  const stepIndex     = STEPS.indexOf(order.status);
  const deliveredAt   = order.delivered_at ? new Date(order.delivered_at).getTime() : null;
  const canReview     = order.status === 'Delivered' &&
    (!deliveredAt || Date.now() - deliveredAt >= 30 * 60 * 1000);
  const courierKey  = order.courier?.toLowerCase().trim() ?? '';
  const trackingUrl = order.trackingNo && COURIER_URLS[courierKey]
    ? COURIER_URLS[courierKey] + order.trackingNo
    : null;

  return (
    <div className="page-wrapper">
      {/* Back */}
      <Link href="/orders" className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
        <i className="fa fa-arrow-left" />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="card mb-4 p-4">
        <p className="font-mono text-xs text-gray-400">Order #{order.id}</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
          <span className="badge badge-green">{order.paymentStatus}</span>
        </div>
      </div>

      {/* Invoice download */}
      <Link
        href={`/orders/${order.id}/invoice`}
        className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-dark-surface dark:text-gray-200 dark:hover:bg-gray-800"
      >
        <i className="fa fa-file-invoice text-primary-500" />
        Download Invoice
        <i className="fa fa-chevron-right ml-auto text-xs text-gray-400" />
      </Link>

      {/* Timeline */}
      <div className="card mb-4 p-4">
        <p className="mb-4 font-semibold dark:text-gray-100">Tracking</p>
        <div className="flex items-start">
          {STEPS.map((step, i) => {
            const done    = i <= stepIndex;
            const current = i === stepIndex;
            const isFirst = i === 0;
            const isLast  = i === STEPS.length - 1;
            const tsVal   = done ? (order[STEP_TS[step]] as string | undefined) : undefined;
            return (
              <div key={step} className="relative flex flex-1 flex-col items-center">
                {/* Left half-connector */}
                {!isFirst && (
                  <div className={`absolute left-0 right-1/2 top-4 h-0.5 -translate-y-px
                    ${i <= stepIndex ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                  />
                )}
                {/* Right half-connector */}
                {!isLast && (
                  <div className={`absolute left-1/2 right-0 top-4 h-0.5 -translate-y-px
                    ${i < stepIndex ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                  />
                )}
                {/* Circle */}
                <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs
                  ring-2 ring-white dark:ring-gray-900
                  ${done ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                  <i className={`fa ${STEP_ICONS[step]}`} />
                  {current && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary-400 ring-2 ring-white dark:ring-gray-900" />
                  )}
                </div>
                <p className={`mt-1 text-center text-[9px] ${done ? 'font-semibold text-primary-600 dark:text-primary-400' : 'text-gray-400'}`}>
                  {step}
                </p>
                {tsVal && (
                  <p className="text-center text-[8px] text-primary-400">{fmtDate(tsVal)}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Items */}
      <div className="card mb-4 p-4">
        <p className="mb-3 font-semibold dark:text-gray-100">Items</p>
        <div className="flex flex-col gap-3">
          {order.items.map((item, i) => {
            const grade = item.grade ? GRADE_LABELS[item.grade] : null;
            return (
              <div key={i} className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium dark:text-gray-100">{item.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {item.variantLabel && (
                      <span className="text-xs text-gray-400">{item.variantLabel}</span>
                    )}
                    {grade && (
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${grade.color}`}>
                        {grade.label}
                      </span>
                    )}
                  </div>
                  {canReview && (
                    <Link
                      href={`/orders/${order.id}/review/${item.productId}`}
                      className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-yellow-50 px-2.5 py-1 text-[11px] font-semibold text-yellow-700 transition hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400"
                    >
                      <i className="fa fa-star text-yellow-400" />
                      Write a Review
                    </Link>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold dark:text-gray-100">× {item.qty}</p>
                  <p className="text-xs text-gray-400">
                    {order.currency.toUpperCase()} {item.lineTotal.toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="card mb-4 p-4">
        <p className="mb-3 font-semibold dark:text-gray-100">Summary</p>
        <div className="flex flex-col gap-2 text-sm">
          {[
            ['Subtotal',  order.total - order.shipping],
            ['Shipping',  order.shipping],
          ].map(([label, val]) => (
            <div key={label as string} className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>{label}</span>
              <span>{order.currency.toUpperCase()} {(val as number).toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-gray-100 pt-2 font-bold dark:border-gray-700 dark:text-gray-100">
            <span>Total</span>
            <span>{order.currency.toUpperCase()} {order.total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Shipping info */}
      <div className="card p-4">
        <p className="mb-3 font-semibold dark:text-gray-100">Shipping</p>

        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {order.customerName}<br />
          {order.customerPhone}<br />
          {[order.customerPlace, order.customerDistrict, order.customerState, order.customerCountry]
            .filter(Boolean).join(', ')}
        </p>

        {/* Tracking */}
        {order.trackingNo ? (
          <div className="mt-3 rounded-xl bg-primary-50 p-3 dark:bg-primary-950/30">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-500">Tracking</p>
            <p className="font-mono text-sm font-bold text-primary-700 dark:text-primary-300">{order.trackingNo}</p>
            {order.courier && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">via {order.courier}</p>
            )}
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-600"
              >
                <i className="fa fa-arrow-up-right-from-square" />
                Track Package
              </a>
            )}
          </div>
        ) : (
          order.status === 'Pending' || order.status === 'Packed' ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              <i className="fa fa-clock text-gray-400" />
              Tracking number will be provided once dispatched
            </div>
          ) : null
        )}

        {/* Pay method */}
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <i className="fa fa-money-bill-wave" />
          Payment: <span className="font-semibold capitalize text-gray-700 dark:text-gray-200">{order.payMethod.replace('_', ' ')}</span>
          <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold
            ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {order.paymentStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
