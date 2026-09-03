import { createHmac, timingSafeEqual } from 'node:crypto';

function sign(payload: string): string {
  const secret = process.env.JWT_SECRET ?? '';
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** companyId + email, HMAC-signed so /unsubscribe/:token needs no auth. */
export function createUnsubscribeToken(
  companyId: string,
  email: string,
): string {
  const payload = Buffer.from(`${companyId}:${email}`).toString('base64url');
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifyUnsubscribeToken(
  token: string,
): { companyId: string; email: string } | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const decoded = Buffer.from(payload, 'base64url').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return null;

  return {
    companyId: decoded.slice(0, separatorIndex),
    email: decoded.slice(separatorIndex + 1),
  };
}
