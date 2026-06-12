import { getOrder }     from '@/actions/orders';
import { getProduct }   from '@/actions/products';
import { hasReviewed }  from '@/actions/reviews';
import { notFound }     from 'next/navigation';
import Link             from 'next/link';
import ReviewForm       from './ReviewForm';

interface Props {
  params: Promise<{ id: string; productId: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const { id: orderId, productId } = await params;

  let order;
  try { order = await getOrder(orderId); } catch { notFound(); }

  if (order.status !== 'Delivered') {
    return (
      <div className="page-wrapper">
        <div className="card p-6 text-center text-sm text-gray-500">
          <i className="fa fa-truck mb-2 block text-2xl" />
          Reviews are only available after your order is delivered.
          <div className="mt-4">
            <Link href={`/orders/${orderId}`} className="text-primary-600 hover:underline">← Back to Order</Link>
          </div>
        </div>
      </div>
    );
  }

  // Enforce 30-minute wait
  const deliveredAt  = order.delivered_at ? new Date(order.delivered_at).getTime() : null;
  const waitMs       = 30 * 60 * 1000;
  const canReview    = !deliveredAt || Date.now() - deliveredAt >= waitMs;

  if (!canReview && deliveredAt) {
    const unlockIn = Math.ceil((deliveredAt + waitMs - Date.now()) / 60000);
    return (
      <div className="page-wrapper">
        <div className="card p-6 text-center text-sm text-gray-500">
          <i className="fa fa-clock mb-2 block text-2xl text-primary-500" />
          <p className="font-semibold">Almost there!</p>
          <p className="mt-1">You can write your review in <strong>{unlockIn} minute{unlockIn !== 1 ? 's' : ''}</strong>.</p>
          <div className="mt-4">
            <Link href={`/orders/${orderId}`} className="text-primary-600 hover:underline">← Back to Order</Link>
          </div>
        </div>
      </div>
    );
  }

  // Check for duplicate
  const alreadyReviewed = await hasReviewed(orderId, productId);
  if (alreadyReviewed) {
    return (
      <div className="page-wrapper">
        <div className="card p-6 text-center text-sm text-gray-500">
          <i className="fa fa-circle-check mb-2 block text-2xl text-green-500" />
          You have already reviewed this product.
          <div className="mt-4">
            <Link href={`/orders/${orderId}`} className="text-primary-600 hover:underline">← Back to Order</Link>
          </div>
        </div>
      </div>
    );
  }

  // Verify this product was in the order
  const item = order.items.find((i) => i.productId === productId);
  if (!item) notFound();

  const product = await getProduct(productId);

  return (
    <div className="page-wrapper">
      <Link href={`/orders/${orderId}`} className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600">
        <i className="fa fa-arrow-left" /> Back to Order
      </Link>
      <h1 className="mb-4 font-heading text-xl font-bold dark:text-gray-100">Write a Review</h1>
      <ReviewForm
        orderId={orderId}
        productId={productId}
        productTitle={product?.title ?? item.title}
      />
    </div>
  );
}
