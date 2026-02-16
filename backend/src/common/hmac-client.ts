import { buildCanonicalString, hashBody, signHmac } from './hmac.service';
import { randomUUID } from 'crypto';

export function signRequest(
  secret: string,
  method: string,
  url: string,
  body: string,
): { signature: string; timestamp: string; nonce: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomUUID();
  const path = new URL(url).pathname;
  const bodyHash = hashBody(body);
  const canonical = buildCanonicalString(method, path, timestamp, nonce, bodyHash);
  const signature = signHmac(secret, canonical);
  return { signature, timestamp, nonce };
}

export function addHmacHeaders(
  headers: Record<string, string>,
  secret: string,
  method: string,
  url: string,
  body: string,
): Record<string, string> {
  const { signature, timestamp, nonce } = signRequest(secret, method, url, body);
  return {
    ...headers,
    'X-Hmac-Signature': signature,
    'X-Hmac-Timestamp': timestamp,
    'X-Hmac-Nonce': nonce,
  };
}
