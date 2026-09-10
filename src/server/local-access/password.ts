/**
 * Password hashing and verification using Node.js built-in scrypt.
 *
 * Hash format: "scrypt:<base64url-salt>:<base64url-hash>"
 *
 * Parameters:
 *   N = 16384  (CPU/memory cost, 2^14)
 *   r = 8      (block size)
 *   p = 1      (parallelization)
 *   keylen = 64 (output length in bytes)
 */

import crypto from 'crypto';
import { base64urlEncode, base64urlDecode, timingSafeEqual } from './crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 32;
const HASH_PREFIX = 'scrypt:';

/**
 * Hash a password using scrypt.
 * Returns: "scrypt:<salt>:<hash>" (both salt and hash in base64url)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `${HASH_PREFIX}${base64urlEncode(salt)}:${base64urlEncode(hash)}`;
}

/**
 * Verify a password against a stored scrypt hash.
 *
 * @param password - plaintext password to verify
 * @param storedHash - output of hashPassword() or env-provided hash
 * @returns true if password matches
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.startsWith(HASH_PREFIX)) {
    return false;
  }

  const parts = storedHash.slice(HASH_PREFIX.length).split(':');
  if (parts.length !== 2) return false;

  const salt = base64urlDecode(parts[0]);
  const expectedHash = base64urlDecode(parts[1]);

  try {
    const actualHash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });
    return timingSafeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
}
