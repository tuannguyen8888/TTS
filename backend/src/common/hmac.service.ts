import { createHash, createHmac } from 'crypto';

const ALGORITHM = 'sha256';

export function signHmac(secret: string, payload: string): string {
  return createHmac(ALGORITHM, secret).update(payload).digest('hex');
}

export function verifyHmac(secret: string, payload: string, signature: string): boolean {
  const expected = signHmac(secret, payload);
  return signature === expected && signature.length > 0;
}

/**
 * Canonical string: method + path + timestamp + nonce + bodyHash
 */
export function buildCanonicalString(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  bodyHash: string,
): string {
  return [method.toUpperCase(), path, timestamp, nonce, bodyHash].join('\n');
}

export function hashBody(body: string): string {
  return createHash(ALGORITHM).update(body).digest('hex');
}
