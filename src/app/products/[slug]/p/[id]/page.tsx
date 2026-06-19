import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string; id: string }>;
}

// Legacy URL /products/{slug}/p/{id} — permanent redirect to /{slug}/p/{id}
export default async function OldProductPage({ params }: Props) {
  const { slug, id } = await params;
  redirect(`/${slug}/p/${id}`);
}
