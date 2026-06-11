'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <i className="fa fa-triangle-exclamation text-4xl text-yellow-500" />
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
        Something went wrong
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button onClick={reset} className="btn-primary">
        Try again
      </button>
    </div>
  );
}
