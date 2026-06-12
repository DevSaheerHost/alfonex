import { getOrder } from '@/actions/orders';
import { notFound }  from 'next/navigation';
import Image          from 'next/image';
import Link           from 'next/link';
import PrintButton    from './PrintButton';

const GRADE_LABELS: Record<string, string> = {
  'a1+': 'Excellent',
  'a2+': 'Very Good',
  'a3+': 'Good',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: Props) {
  const { id } = await params;
  let order;
  try { order = await getOrder(id); } catch { notFound(); }

  const cur  = order.currency.toUpperCase();
  const date = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <>
      {/* Hide layout chrome when printing */}
      <style>{`
        @media print {
          header, nav, aside, .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="page-wrapper max-w-2xl">
        {/* Top controls — hidden on print */}
        <div className="no-print mb-6 flex items-center gap-3">
          <Link href={`/orders/${id}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
            <i className="fa fa-arrow-left" /> Back
          </Link>
          <span className="ml-auto">
            <PrintButton />
          </span>
        </div>

        {/* Invoice card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-dark-surface print:border-0 print:shadow-none">

          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <Image
                src="/assets/logo/light_nobg.png"
                alt="Alfonex"
                width={120}
                height={38}
                className="mb-2 dark:hidden"
              />
              <Image
                src="/assets/logo/dark_nobg.png"
                alt="Alfonex"
                width={120}
                height={38}
                className="mb-2 hidden dark:block print:hidden"
              />
              <p className="text-xs text-gray-400">alfonex.com</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">INVOICE</p>
              <p className="font-mono text-xs text-gray-400">#{order.id}</p>
              <p className="mt-0.5 text-xs text-gray-500">{date}</p>
            </div>
          </div>

          {/* Bill to */}
          <div className="mb-6 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Bill To</p>
            <p className="font-semibold dark:text-gray-100">{order.customerName}</p>
            <p className="text-sm text-gray-500">{order.customerPhone}</p>
            <p className="text-sm text-gray-500">
              {[order.customerPlace, order.customerDistrict, order.customerState, order.customerCountry]
                .filter(Boolean).join(', ')}
            </p>
          </div>

          {/* Items table */}
          <table className="mb-6 w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Item</th>
                <th className="pb-2 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">Qty</th>
                <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Unit</th>
                <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-50 dark:border-gray-800">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium dark:text-gray-100">{item.title}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                      {item.variantLabel && (
                        <span className="text-xs text-gray-400">{item.variantLabel}</span>
                      )}
                      {item.grade && GRADE_LABELS[item.grade] && (
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {GRADE_LABELS[item.grade]}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 text-center text-gray-600 dark:text-gray-300">{item.qty}</td>
                  <td className="py-2.5 text-right text-gray-600 dark:text-gray-300">
                    {cur} {item.unitPrice.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-semibold dark:text-gray-100">
                    {cur} {item.lineTotal.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mb-6 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Subtotal</span>
              <span>{cur} {(order.total - order.shipping).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Shipping</span>
              <span>{cur} {order.shipping.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold dark:border-gray-600 dark:text-gray-100">
              <span>Total</span>
              <span>{cur} {order.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment info */}
          <div className="flex items-center justify-between rounded-xl border border-gray-100 p-3 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm">
              <i className="fa fa-money-bill-wave text-gray-400" />
              <span className="capitalize text-gray-600 dark:text-gray-300">
                {order.payMethod.replace('_', ' ')}
              </span>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold
              ${order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {order.paymentStatus}
            </span>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-[10px] text-gray-300 dark:text-gray-600">
            Thank you for shopping with Alfonex · alfonex.com
          </p>
        </div>
      </div>
    </>
  );
}
