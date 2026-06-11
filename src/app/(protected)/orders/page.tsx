import { getUserOrders } from '@/actions/orders';
import Link from 'next/link';
import type { Order } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  Pending:    'badge-yellow',
  Packed:     'badge-gray',
  Dispatched: 'badge-gray',
  Shipped:    'badge-green',
  'In Transit': 'badge-green',
  Delivered:  'badge-green',
};

export default async function OrdersPage() {
  let orders: Order[] = [];
  let fetchError = '';

  try {
    orders = await getUserOrders();
  } catch (e: unknown) {
    fetchError = (e as Error).message;
  }

  return (
    <div className="page-wrapper">
      <h1 className="mb-4 font-heading text-xl font-bold dark:text-gray-100">My Orders</h1>

      {fetchError && (
        <div className="card p-4 text-sm text-red-600">{fetchError}</div>
      )}

      {orders.length === 0 && !fetchError && (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <i className="fa fa-box-open text-5xl" />
          <p className="text-sm font-medium">No orders yet</p>
          <Link href="/" className="btn-primary text-sm">Start Shopping</Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`}>
            <div className="card flex items-center justify-between gap-3 p-4 transition hover:shadow-md">
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-mono text-gray-400">#{order.id}</p>
                <p className="mt-0.5 text-sm font-semibold dark:text-gray-100">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''} ·{' '}
                  {order.currency.toUpperCase()} {order.total.toLocaleString()}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`badge ${STATUS_STYLES[order.status] ?? 'badge-gray'}`}>
                  {order.status}
                </span>
                <i className="fa fa-chevron-right text-xs text-gray-400" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
