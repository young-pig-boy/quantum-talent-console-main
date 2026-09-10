/**
 * HMAC-signed access token generation and verification.
 *
 * Token format: "<base64url(payload)>.<base64url(hmac_hex)>"
 *
 * The payload is a simple JSON object: { sub: actorId, iat: timestamp }
 *
 * Security properties:
 *   - HMAC-SHA256 ensures integrity and authenticity
 *   - iat (issued-at) enables future expiry if needed
 *   - Constant-time comparison prevents timing attacks
 *   - HttpOnly cookie prevents JavaScript access
 *
 * Uses Web Crypto API — compatible with Edge Runtime (middleware) and Node.js.
 */

import {
  base64urlEncode,
  base64urlDecode,
  hmacSign,
  hmacVerify,
  timingSafeEqual,
} from './crypto';
import { getLocalAccessSecret, getBreakGlassSessionTtl } from './config';

/** Token payload */
interface TokenPayload {
  sub: string;  // actor ID
  iat: number;  // issued-at (Unix seconds)
  exp?: number;  // expires-at (Unix seconds)
}

/** Token separator */
const SEP = '.';

/**
 * Generate a signed access token for the given actor ID.
 */
export function generateAccessToken(actorId: string): string {
  // This function is only called from Node.js runtime (login route),
  // but we keep the implementation compatible.
  // We use a sync workaround: create the payload first, then it gets signed.
  // For the login route, we call this from an async context anyway.
  const payload: TokenPayload = {
    sub: actorId,
    iat: Math.floor(Date.now() / 1000),
  };
  const payloadJson = JSON.stringify(payload);
  const payloadEncoded = base64urlEncode(payloadJson);
  // We need sync HMAC, but Web Crypto is async. We'll use a lazy approach:
  // store the payload and sign it when the token is actually used.
  // For now, we mark this as needing async signing.
  throw new Error(
    'Use generateAccessTokenAsync for Edge-compatible token generation'
  );
}

/**
 * Generate a signed access token (async, Edge-compatible).
 */
export async function generateAccessTokenAsync(actorId: string, ttlSeconds?: number): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: actorId,
    iat,
    exp: iat + (ttlSeconds ?? getBreakGlassSessionTtl()),
  };
  const payloadJson = JSON.stringify(payload);
  const payloadEncoded = base64urlEncode(payloadJson);
  const signature = await hmacSign(payloadEncoded, getLocalAccessSecret());
  return `${payloadEncoded}${SEP}${signature}`;
}

/**
 * Verify a signed access token (async, Edge-compatible).
 *
 * @returns The actor ID (sub) if valid, null otherwise.
 */
export async function verifyAccessToken(token: string): Promise<string | null> {
  if (!token) return null;

  const parts = token.split(SEP);
  if (parts.length !== 2) return null;

  const [payloadEncoded, signatureHex] = parts;

  // Verify HMAC signature
  let valid: boolean;
  try {
    valid = await hmacVerify(payloadEncoded, signatureHex, getLocalAccessSecret());
  } catch {
    return null;
  }

  if (!valid) return null;

  // Decode payload
  let payload: TokenPayload;
  try {
    const payloadJson = new TextDecoder().decode(base64urlDecode(payloadEncoded));
    payload = JSON.parse(payloadJson) as TokenPayload;
  } catch {
    return null;
  }

  if (!payload.sub || typeof payload.sub !== 'string') return null;

  // Check expiry if present
  if (typeof payload.exp === 'number' && payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload.sub;
}
