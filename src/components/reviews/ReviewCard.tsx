import StarRating from './StarRating';
import type { Review } from '@/lib/types';
import Image from 'next/image';

function timeAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30)  return `${d} days ago`;
  if (d < 365) return `${Math.floor(d / 30)} months ago`;
  return `${Math.floor(d / 365)} years ago`;
}

export default function ReviewCard({ review }: { review: Review }) {
  const images = review.mediaUrls.filter((u) => !u.includes('/video/'));
  const videos = review.mediaUrls.filter((u) =>  u.includes('/video/'));

  return (
    <div className="border-b border-gray-100 py-4 last:border-0 dark:border-gray-800">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
            {review.userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold dark:text-gray-100">{review.userName}</p>
            {review.verified && (
              <span className="text-[10px] text-green-600 dark:text-green-400">
                <i className="fa fa-circle-check mr-0.5" />Verified Purchase
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400">{timeAgo(review.createdAt)}</p>
      </div>

      <StarRating value={review.rating} readonly size="sm" />

      {review.text && (
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{review.text}</p>
      )}

      {/* Images */}
      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
                <Image src={url} alt={`Review image ${i + 1}`} fill className="object-cover" sizes="80px" />
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Videos */}
      {videos.map((url, i) => (
        <video key={i} src={url} controls className="mt-3 max-h-48 w-full rounded-xl" />
      ))}
    </div>
  );
}
