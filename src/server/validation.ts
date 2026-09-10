import { OFFICIAL_VILLAGES_AC58 } from '../data/villagesList.ts';

const VALID_ROLES = new Set(['SUPER_ADMIN', 'VILLAGE_HEAD', 'MEMBER']);
const VALID_ISSUE_STATUSES = new Set(['NEW', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);
const VALID_ISSUE_PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const VALID_TASK_STATUSES = new Set(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

// Set of valid village IDs from the authentic 124 villages roster
const validVillageIds = new Set(OFFICIAL_VILLAGES_AC58.map(v => v.village_id));

export function isValidMobile(mobile: string | undefined | null): boolean {
  if (!mobile || typeof mobile !== 'string') return false;
  const cleaned = mobile.replace(/\D/g, '');
  // Indian 10-digit mobile number starting with 6, 7, 8, or 9
  return /^[6-9]\d{9}$/.test(cleaned);
}

export const validateMobile = isValidMobile;

export function cleanMobile(mobile: string): string {
  return mobile.replace(/\D/g, '').slice(-10);
}

export function isValidVoterId(voterId: string | undefined | null): boolean {
  if (!voterId || typeof voterId !== 'string') return false;
  const trimmed = voterId.trim().toUpperCase();
  // Standard Indian EPIC format is 3 letters + 7 digits (e.g. ABC1234567),
  // or state-specific alphanumeric format between 6 and 20 chars
  return /^[A-Z0-9]{6,20}$/.test(trimmed);
}

export const validateVoterId = isValidVoterId;

export function isValidVillageId(villageId: string | undefined | null): boolean {
  if (!villageId || typeof villageId !== 'string') return false;
  return validVillageIds.has(villageId.trim());
}

export function validateRegistrationInput(data: any): { isValid: boolean; error?: string } {
  if (!data) return { isValid: false, error: 'Registration data is required.' };
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    return { isValid: false, error: 'Full name is required.' };
  }
  if (!data.mobile || !isValidMobile(data.mobile)) {
    return { isValid: false, error: 'Please enter a valid 10-digit registered mobile number.' };
  }
  if (!data.voter_id || !isValidVoterId(data.voter_id)) {
    return { isValid: false, error: 'Please enter a valid Voter ID / EPIC number.' };
  }
  if (!data.village_id || !isValidVillageId(data.village_id)) {
    return { isValid: false, error: 'Please select a valid Sindhanur AC-58 village.' };
  }
  if (!data.password || typeof data.password !== 'string' || data.password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long.' };
  }
  return { isValid: true };
}

export function isValidRole(role: string | undefined | null): boolean {
  if (!role || typeof role !== 'string') return false;
  return VALID_ROLES.has(role);
}

export function isValidIssueStatus(status: string | undefined | null): boolean {
  if (!status || typeof status !== 'string') return false;
  return VALID_ISSUE_STATUSES.has(status);
}

export function isValidIssuePriority(priority: string | undefined | null): boolean {
  if (!priority || typeof priority !== 'string') return false;
  return VALID_ISSUE_PRIORITIES.has(priority);
}

export function isValidTaskStatus(status: string | undefined | null): boolean {
  if (!status || typeof status !== 'string') return false;
  return VALID_TASK_STATUSES.has(status);
}

export function isValidDateString(dateStr: string | undefined | null): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const parsed = Date.parse(dateStr);
  return !isNaN(parsed);
}
