import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-wrapper flex min-h-[80vh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-heading text-7xl font-black text-primary-500">404</p>
      <h1 className="text-xl font-bold dark:text-gray-100">Page Not Found</h1>
      <p className="text-sm text-gray-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="btn-primary">Go Home</Link>
    </div>
  );
}
