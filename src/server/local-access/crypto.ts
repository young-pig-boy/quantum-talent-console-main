/**
 * Crypto primitives for local console access.
 *
 * Uses Web Crypto API (available in Edge Runtime, Node.js 19+, and browsers).
 * This ensures middleware (which runs in Edge Runtime) can verify tokens.
 *
 * Zero Node.js built-in dependencies — pure Web APIs.
 */

/** HMAC algorithm */
const HMAC_ALGORITHM = { name: 'HMAC', hash: 'SHA-256' };

// Base64 alphabet
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Base64URL encode (RFC 4648 §5) without trailing padding.
 */
export function base64urlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;

  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += BASE64_CHARS[b1 >> 2];
    result += BASE64_CHARS[((b1 & 3) << 4) | (b2 >> 4)];
    result += i + 1 < bytes.length ? BASE64_CHARS[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    result += i + 2 < bytes.length ? BASE64_CHARS[b3 & 63] : '=';
  }

  // Convert to base64url
  return result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64URL decode to Uint8Array.
 */
export function base64urlDecode(encoded: string): Uint8Array {
  // Restore padding and standard base64
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';

  const result: number[] = [];
  for (let i = 0; i < base64.length; i += 4) {
    const idx1 = BASE64_CHARS.indexOf(base64[i]);
    const idx2 = BASE64_CHARS.indexOf(base64[i + 1]);
    const idx3 = base64[i + 2] === '=' ? -1 : BASE64_CHARS.indexOf(base64[i + 2]);
    const idx4 = base64[i + 3] === '=' ? -1 : BASE64_CHARS.indexOf(base64[i + 3]);

    if (idx1 < 0 || idx2 < 0) continue;

    result.push((idx1 << 2) | (idx2 >> 4));
    if (idx3 >= 0) result.push(((idx2 & 15) << 4) | (idx3 >> 2));
    if (idx4 >= 0) result.push(((idx3 & 3) << 6) | idx4);
  }

  return new Uint8Array(result);
}

/**
 * Convert Uint8Array to hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Get the Web Crypto subtle object.
 */
function getSubtle(): SubtleCrypto {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('Web Crypto API not available');
}

/**
 * Import a raw HMAC key from a secret string.
 */
async function importHmacKey(secret: string): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(secret);
  return getSubtle().importKey('raw', keyData, HMAC_ALGORITHM, false, ['sign', 'verify']);
}

/**
 * Compute HMAC-SHA256 of `data` using `secret`.
 * Returns hex-encoded string.
 */
export async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const dataBytes = new TextEncoder().encode(data);
  const signature = await getSubtle().sign(HMAC_ALGORITHM.name, key, dataBytes as BufferSource);
  return bytesToHex(new Uint8Array(signature));
}

/**
 * Verify HMAC-SHA256 signature.
 */
export async function hmacVerify(
  data: string,
  signatureHex: string,
  secret: string,
): Promise<boolean> {
  const key = await importHmacKey(secret);
  const expectedSig = hexToBytes(signatureHex);
  const dataBytes = new TextEncoder().encode(data);
  return getSubtle().verify(HMAC_ALGORITHM.name, key, expectedSig as BufferSource, dataBytes as BufferSource);
}

/**
 * Constant-time comparison of two Uint8Arrays.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Generate a cryptographically random token.
 */
export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buf);
  return base64urlEncode(buf);
}

/**
 * Convert a Uint8Array to a Buffer-compatible object for Node.js APIs.
 */
export function toBuffer(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes);
}
