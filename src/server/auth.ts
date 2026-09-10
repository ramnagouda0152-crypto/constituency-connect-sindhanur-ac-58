import type { Request, Response, NextFunction } from 'express';
import { repository } from './db/postgresRepo.ts';
import {
  createSessionToken,
  destroySessionToken,
  invalidateUserSessions,
  getSession
} from './db/sessionStore.ts';
import type { User, UserRole } from '../types.ts';

// Re-export session management functions
export { createSessionToken, destroySessionToken, invalidateUserSessions };

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: User;
  allowedVillageIds?: string[] | null; // null means all villages (Super/Constituency Admin)
}

/**
 * Core Authentication Middleware
 * Validates session token strictly from Authorization: Bearer <token> or x-auth-token header.
 * Rejects insecure header bypasses (x-user-id, x-role, x-village-id).
 */
export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  // Reject any spoofing attempts via headers
  if (req.headers['x-role'] || req.headers['x-village-id'] || req.headers['x-user-id']) {
    res.status(403).json({
      error: 'Security violation: Header spoofing detected. Role, village, and user identity must be resolved from session.',
      code: 'HEADER_SPOOFING_ATTEMPT'
    });
    return;
  }

  const authHeader = req.headers.authorization;
  const tokenHeader = (req.headers['x-auth-token'] as string) || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

  let user: User | undefined;

  if (tokenHeader) {
    const session = await getSession(tokenHeader);
    if (session) {
      user = await repository.findUserById(session.userId);
    }
  }

  if (!user || user.status !== 'ACTIVE') {
    res.status(401).json({
      error: user && user.status === 'PENDING'
        ? 'Account registration is pending verification by the Constituency Administrator.'
        : 'Unauthorized: Valid authenticated session required.',
      code: user && user.status === 'PENDING' ? 'ACCOUNT_PENDING' : 'UNAUTHENTICATED',
      status: user?.status
    });
    return;
  }

  req.user = user;

  // Compute allowed village IDs based on role
  if (user.role === 'SUPER_ADMIN') {
    req.allowedVillageIds = null; // ALL villages permitted
  } else if (user.role === 'VILLAGE_HEAD' || user.role === 'MEMBER') {
    // CRITICAL: A Village Head or Member is strictly bound to EXACTLY ONE village
    if (!user.village_id) {
      res.status(403).json({
        error: `Access Denied: ${user.role} account does not have a designated village assignment.`,
        code: 'NO_VILLAGE_ASSIGNMENT'
      });
      return;
    }
    req.allowedVillageIds = [user.village_id];
  } else {
    req.allowedVillageIds = [];
  }

  next();
}

/**
 * Strict Village Isolation Guard
 * Checks if the requested village_id is allowed for the authenticated user.
 * If unauthorized, returns HTTP 403 "Access Denied — You are not authorized to access this village."
 */
export function enforceVillageAccess(
  req: AuthenticatedRequest,
  res: Response,
  targetVillageId: string | undefined | null
): boolean {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthenticated', code: 'AUTH_REQUIRED' });
    return false;
  }

  // Super Admin has constituency-wide access to all 124 villages
  if (req.user.role === 'SUPER_ADMIN') {
    return true;
  }

  // If no village specified for a village-specific check, reject
  if (!targetVillageId) {
    res.status(400).json({ error: 'Village ID is required for this operation.' });
    return false;
  }

  // VILLAGE_HEAD & MEMBER strict isolation rule:
  // authenticated_user.village_id MUST EQUAL requested_record.village_id
  if (req.user.role === 'VILLAGE_HEAD' || req.user.role === 'MEMBER') {
    if (req.user.village_id !== targetVillageId) {
      repository.logAudit({
        user_id: req.user.user_id,
        user_name: req.user.name,
        role: req.user.role,
        action: 'PERMISSION_CHANGE',
        record_type: 'SECURITY_VIOLATION_BLOCKED',
        record_id: targetVillageId,
        village_id: req.user.village_id,
        details: `BLOCKED 403: ${req.user.role} (${req.user.name}) attempted unauthorized access to village ${targetVillageId}. Assigned village is ${req.user.village_id}.`
      });

      res.status(403).json({
        error: 'Access Denied — You are not authorized to access this village.',
        code: 'VILLAGE_ISOLATION_VIOLATION',
        user_village: req.user.village_id,
        attempted_village: targetVillageId
      });
      return false;
    }
    return true;
  }

  res.status(403).json({
    error: 'Access Denied — Insufficient privileges.',
    code: 'INSUFFICIENT_PRIVILEGES'
  });
  return false;
}

/**
 * Super Admin Only Guard
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({
      error: 'Access Denied: Super Admin privileges required.',
      code: 'SUPER_ADMIN_REQUIRED'
    });
    return;
  }
  next();
}

/**
 * Village Head Only Guard for Creating Video Conferences
 * ONLY the VILLAGE_HEAD role can CREATE a video conference.
 * SUPER_ADMIN and MEMBER must be rejected with 403.
 */
export function requireVillageHeadForMeeting(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'VILLAGE_HEAD') {
    res.status(403).json({
      error: 'Only Village Heads can create video conferences.',
      code: 'VILLAGE_HEAD_ONLY_MEETING_CREATION'
    });
    return;
  }

  if (!req.user.village_id) {
    res.status(403).json({
      error: 'Village Head has no assigned village.',
      code: 'NO_VILLAGE_ASSIGNED'
    });
    return;
  }

  next();
}
