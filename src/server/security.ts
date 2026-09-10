import crypto from 'crypto';

/**
 * Production Security & Cryptographic Utilities
 * - PBKDF2 Password Hashing with Salt
 * - Timing-safe password verification
 * - Masking utility for Voter IDs in public endpoints
 */

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Cryptographically secure ID generator replacing Math.random
 */
export function generateSecureId(prefix: string = 'SEC'): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Mask voter ID to protect privacy (e.g., 'ABC1234567' -> 'ABC****567')
 */
export function maskVoterId(voterId?: string): string | undefined {
  if (!voterId) return undefined;
  if (voterId.length <= 4) return '****';
  const visiblePrefix = voterId.substring(0, 3);
  const visibleSuffix = voterId.substring(voterId.length - 3);
  return `${visiblePrefix}****${visibleSuffix}`;
}
