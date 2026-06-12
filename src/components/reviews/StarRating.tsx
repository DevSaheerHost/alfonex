'use client';

interface Props {
  value:      number;
  onChange?:  (v: number) => void;
  size?:      'sm' | 'md' | 'lg';
  readonly?:  boolean;
}

const SIZES = { sm: 'text-sm', md: 'text-xl', lg: 'text-2xl' };

export default function StarRating({ value, onChange, size = 'md', readonly = false }: Props) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${SIZES[size]} transition ${readonly ? 'cursor-default' : 'hover:scale-110 active:scale-95'}`}
          aria-label={`${star} star`}
        >
          <i className={`fa-star ${star <= value ? 'fa-solid text-yellow-400' : 'fa-regular text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}
