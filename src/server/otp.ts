import crypto from 'crypto';

interface OtpEntry {
  otpHash: string;
  salt: string;
  mobile: string;
  voterId: string;
  expiresAt: number;
  attempts: number;
}

// In-memory OTP storage keyed by voterId + mobile
const otpStore = new Map<string, OtpEntry>();

function getKey(mobile: string, voterId: string): string {
  return `${mobile.replace(/\D/g, '')}:${voterId.trim().toUpperCase()}`;
}

function hashOtp(otp: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(otp).digest('hex');
}

/**
 * Generate a cryptographically secure 6-digit OTP
 */
export function generateOtp(mobile: string, voterId: string): { otp: string; expiresInSeconds: number } {
  const key = getKey(mobile, voterId);
  const otpNumber = crypto.randomInt(100000, 999999).toString();
  const salt = crypto.randomBytes(16).toString('hex');
  const otpHash = hashOtp(otpNumber, salt);
  const expiresInSeconds = 10 * 60; // 10 minutes

  otpStore.set(key, {
    otpHash,
    salt,
    mobile: mobile.replace(/\D/g, ''),
    voterId: voterId.trim().toUpperCase(),
    expiresAt: Date.now() + expiresInSeconds * 1000,
    attempts: 0
  });

  return { otp: otpNumber, expiresInSeconds };
}

/**
 * Verify OTP for mobile + voterId
 */
export function verifyOtp(mobile: string, voterId: string, inputOtp: string): { valid: boolean; error?: string } {
  const key = getKey(mobile, voterId);
  const entry = otpStore.get(key);

  if (!entry) {
    return { valid: false, error: 'No OTP requested or OTP has expired. Please request a new OTP.' };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return { valid: false, error: 'OTP has expired. Please request a new OTP.' };
  }

  entry.attempts += 1;
  if (entry.attempts > 4) {
    otpStore.delete(key);
    return { valid: false, error: 'Too many failed verification attempts. Please request a new OTP.' };
  }

  const computedHash = hashOtp(inputOtp.trim(), entry.salt);
  if (computedHash !== entry.otpHash) {
    return { valid: false, error: `Invalid OTP. ${4 - entry.attempts} attempt(s) remaining.` };
  }

  // Validated! Clear OTP from store so it cannot be reused
  otpStore.delete(key);
  return { valid: true };
}
