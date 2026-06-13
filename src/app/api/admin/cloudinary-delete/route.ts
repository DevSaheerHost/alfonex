import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { adminAuth, adminRtdb } from '@/lib/firebase/admin';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DeleteRequest {
  /** Full Cloudinary URLs to delete (image or raw) */
  urls: string[];
}

interface CloudinaryResult {
  url:       string;
  publicId:  string;
  result:    'deleted' | 'not found' | 'error';
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const CLOUD_NAME   = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD ?? 'saheerbabu';
const API_KEY      = process.env.CLOUDINARY_API_KEY    ?? '';
const API_SECRET   = process.env.CLOUDINARY_API_SECRET ?? '';

/**
 * Extracts the Cloudinary public_id and resource_type from a delivery URL.
 *
 * URL format:
 *   https://res.cloudinary.com/{cloud}/{resource_type}/upload/v{ver}/{public_id}.{ext}
 *
 * For images, the extension is NOT part of the public_id.
 * For raw files (.glb, .gltf, .usdz), the extension IS part of the public_id.
 */
function parseCloudinaryUrl(url: string): { publicId: string; resourceType: string } | null {
  if (!url.includes('cloudinary.com')) return null;

  // Match /image/upload/ or /raw/upload/ paths
  const match = url.match(/\/(?:upload|authenticated)\/(?:v\d+\/)?(.+)$/);
  if (!match) return null;

  const resourceType = url.includes('/raw/') ? 'raw' : 'image';
  let publicId = match[1];

  // For images, strip the file extension from the public_id
  if (resourceType === 'image') {
    publicId = publicId.replace(/\.[^./]+$/, '');
  }

  // Strip any Cloudinary transformation prefix (e.g. f_auto,q_auto,w_200/)
  publicId = publicId.replace(/^[^/]+\//, (seg) =>
    /^[a-z_,./]+$/.test(seg) ? '' : seg,
  );

  return { publicId, resourceType };
}

/** Generates a SHA-1 signature for Cloudinary's signed destroy API */
function sign(publicId: string, timestamp: number): string {
  const payload = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
  return createHash('sha1').update(payload).digest('hex');
}

/** Calls Cloudinary's destroy endpoint for a single asset */
async function destroyAsset(
  publicId: string,
  resourceType: string,
): Promise<'deleted' | 'not found' | 'error'> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign(publicId, timestamp);

  const fd = new FormData();
  fd.append('public_id',     publicId);
  fd.append('timestamp',     String(timestamp));
  fd.append('api_key',       API_KEY);
  fd.append('signature',     signature);
  fd.append('invalidate',    'true'); // purge CDN cache immediately

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/destroy`;
  const res = await fetch(endpoint, { method: 'POST', body: fd });

  if (!res.ok) return 'error';
  const data = await res.json() as { result: string };
  return data.result === 'ok' ? 'deleted' : 'not found';
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Verify Firebase Admin token
  const authHeader = req.headers.get('authorization') ?? '';
  const idToken    = authHeader.replace('Bearer ', '').trim();
  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const decoded   = await adminAuth().verifyIdToken(idToken);
    const adminSnap = await adminRtdb().ref(`admins/${decoded.uid}`).get();
    if (!adminSnap.exists()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // 2. Validate env vars
  if (!API_KEY || !API_SECRET) {
    console.error('[cloudinary-delete] Missing CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // 3. Parse request body
  const { urls } = await req.json() as DeleteRequest;
  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ deleted: 0, results: [] });
  }

  // 4. Delete each asset in parallel
  const results: CloudinaryResult[] = await Promise.all(
    urls.map(async (url) => {
      const parsed = parseCloudinaryUrl(url);
      if (!parsed) return { url, publicId: '', result: 'not found' as const };

      const result = await destroyAsset(parsed.publicId, parsed.resourceType).catch(
        () => 'error' as const,
      );

      return { url, publicId: parsed.publicId, result };
    }),
  );

  const deletedCount = results.filter((r) => r.result === 'deleted').length;
  console.log(`[cloudinary-delete] Deleted ${deletedCount}/${urls.length} assets`);

  return NextResponse.json({ deleted: deletedCount, results });
}
