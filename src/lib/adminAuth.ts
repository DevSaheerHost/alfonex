import { createHash }     from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

const secret = () => new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);

export function hashPasscode(passcode: string): string {
  return createHash('sha256').update(passcode).digest('hex');
}

export async function signAdminToken(expiresIn = '24h'): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}
