'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import StarRating   from '@/components/reviews/StarRating';
import { submitReview } from '@/actions/reviews';
import Image from 'next/image';

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    ?? '';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

const MAX_IMAGES     = 5;
const MAX_IMAGE_MB   = 10;
const MAX_VIDEO_MB   = 50;

interface MediaFile {
  file:    File;
  preview: string;
  type:    'image' | 'video';
}

interface Props {
  orderId:      string;
  productId:    string;
  productTitle: string;
}

export default function ReviewForm({ orderId, productId, productTitle }: Props) {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [rating,    setRating]    = useState(0);
  const [text,      setText]      = useState('');
  const [media,     setMedia]     = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const next = [...media];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isImage && !isVideo) { setError('Only images and videos allowed.'); continue; }
      if (isImage && file.size > MAX_IMAGE_MB * 1024 * 1024) {
        setError(`Images must be under ${MAX_IMAGE_MB}MB.`); continue;
      }
      if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
        setError(`Videos must be under ${MAX_VIDEO_MB}MB.`); continue;
      }
      if (isImage && next.filter((m) => m.type === 'image').length >= MAX_IMAGES) {
        setError(`Maximum ${MAX_IMAGES} images allowed.`); continue;
      }
      if (isVideo && next.some((m) => m.type === 'video')) {
        setError('Only 1 video allowed per review.'); continue;
      }
      next.push({ file, preview: URL.createObjectURL(file), type: isVideo ? 'video' : 'image' });
    }
    setMedia(next);
  };

  const removeMedia = (i: number) => {
    URL.revokeObjectURL(media[i].preview);
    setMedia((prev) => prev.filter((_, idx) => idx !== i));
  };

  const uploadToCloudinary = async (item: MediaFile): Promise<string> => {
    const form = new FormData();
    form.append('file',           item.file);
    form.append('upload_preset',  UPLOAD_PRESET);
    form.append('folder',         'alfonex/reviews');
    const endpoint = item.type === 'video'
      ? `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`
      : `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const res  = await fetch(endpoint, { method: 'POST', body: form });
    const data = await res.json() as { secure_url?: string; error?: { message: string } };
    if (!res.ok || !data.secure_url) throw new Error(data.error?.message ?? 'Upload failed');
    return data.secure_url;
  };

  const handleSubmit = async () => {
    setError('');
    if (rating === 0) { setError('Please select a star rating.'); return; }
    if (!text.trim() && media.length === 0) { setError('Please write something or add a photo.'); return; }

    setUploading(true);
    try {
      const mediaUrls = await Promise.all(media.map(uploadToCloudinary));
      await submitReview(productId, orderId, rating, text, mediaUrls);
      setSuccess(true);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="card p-8 text-center">
        <i className="fa fa-circle-check mb-3 block text-4xl text-green-500" />
        <p className="font-heading text-lg font-bold dark:text-gray-100">Thank you for your review!</p>
        <p className="mt-1 text-sm text-gray-500">Your feedback helps other customers.</p>
        <button onClick={() => router.push(`/orders/${orderId}`)} className="btn-primary mt-5">
          Back to Order
        </button>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <p className="mb-1 text-xs text-gray-400">Reviewing</p>
      <p className="mb-4 truncate font-semibold dark:text-gray-100">{productTitle}</p>

      {/* Stars */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium dark:text-gray-200">Your Rating *</p>
        <StarRating value={rating} onChange={setRating} size="lg" />
        {rating > 0 && (
          <p className="mt-1 text-xs text-gray-400">
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </p>
        )}
      </div>

      {/* Text */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium dark:text-gray-200">Your Review</p>
        <textarea
          className="input resize-none"
          rows={4}
          placeholder="Share your experience with this product..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
        />
        <p className="mt-1 text-right text-[10px] text-gray-400">{text.length}/1000</p>
      </div>

      {/* Media upload */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium dark:text-gray-200">
          Photos & Video
          <span className="ml-1.5 text-xs font-normal text-gray-400">
            (up to {MAX_IMAGES} images · {MAX_IMAGE_MB}MB each · 1 video · {MAX_VIDEO_MB}MB)
          </span>
        </p>

        {/* Previews */}
        {media.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {media.map((m, i) => (
              <div key={i} className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                {m.type === 'image' ? (
                  <Image src={m.preview} alt="" fill className="object-cover" sizes="80px" />
                ) : (
                  <video src={m.preview} className="h-full w-full object-cover" />
                )}
                <button
                  onClick={() => removeMedia(i)}
                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <i className="fa fa-times text-[9px]" />
                </button>
                {m.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <i className="fa fa-play text-white text-sm" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 transition hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:hover:border-primary-500"
        >
          <i className="fa fa-camera" />
          Add Photos / Video
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={uploading}
        className="btn-primary w-full"
      >
        {uploading
          ? <><i className="fa fa-spinner fa-spin" /> Uploading & Submitting…</>
          : <><i className="fa fa-star" /> Submit Review</>}
      </button>
    </div>
  );
}
