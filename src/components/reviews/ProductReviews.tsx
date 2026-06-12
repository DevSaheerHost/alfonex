import ReviewCard from './ReviewCard';
import StarRating  from './StarRating';
import type { Review } from '@/lib/types';

interface Props {
  reviews: Review[];
}

export default function ProductReviews({ reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <div className="card mt-6 p-5">
        <p className="mb-3 font-semibold dark:text-gray-100">Customer Reviews</p>
        <div className="py-6 text-center text-sm text-gray-400">
          <i className="fa fa-star mb-2 block text-2xl opacity-30" />
          No reviews yet — be the first!
        </div>
      </div>
    );
  }

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="card mt-6 p-5">
      <p className="mb-4 font-semibold dark:text-gray-100">Customer Reviews</p>

      {/* Summary */}
      <div className="mb-4 flex items-center gap-4">
        <div className="text-center">
          <p className="font-heading text-4xl font-bold text-primary-600 dark:text-primary-400">
            {avg.toFixed(1)}
          </p>
          <StarRating value={Math.round(avg)} readonly size="sm" />
          <p className="mt-0.5 text-xs text-gray-400">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          {dist.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-4 text-right text-gray-500">{star}</span>
              <i className="fa fa-star text-yellow-400 text-[10px]" />
              <div className="flex-1 rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-1.5 rounded-full bg-yellow-400"
                  style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }}
                />
              </div>
              <span className="w-4 text-gray-400">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* List */}
      <div>
        {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
      </div>
    </div>
  );
}
