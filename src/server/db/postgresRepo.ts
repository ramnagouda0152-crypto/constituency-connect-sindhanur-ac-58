import type {
  Constituency,
  Taluk,
  GramPanchayat,
  Village,
  Booth,
  User,
  UserStatus,
  Issue,
  IssueUpdate,
  DevelopmentProject,
  ProjectUpdate,
  FieldVisit,
  VillageMeeting,
  Task,
  TaskStatus,
  VillageDocument,
  Notification,
  AuditLog,
  VideoMeeting,
  VideoParticipant,
  Announcement,
  Conference,
  ConferenceParticipant
} from '../../types.ts';
import crypto from 'crypto';
import { getPostgresPool, withTransaction, isProduction, initializeSchema } from './postgresPool.ts';
import { hashPassword, maskVoterId, generateSecureId } from '../security.ts';
import { db, type ServerUser } from '../db.ts';
import { migrateDataToPostgres } from './migrate.ts';

export class PostgresRepository {
  private get pool() {
    const p = getPostgresPool();
    if (!p) {
      throw new Error('Database connection unavailable. Please try again later.');
    }
    return p;
  }

  // --- Audit Logs ---
  public async logAudit(entry: Omit<AuditLog, 'audit_id' | 'timestamp'>): Promise<AuditLog> {
    const audit_id = generateSecureId('AUD');
    const timestamp = new Date().toISOString();
    try {
      await this.pool.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [audit_id, entry.user_id, entry.user_name, entry.role, entry.action, entry.record_type, entry.record_id || null, entry.village_id || null, entry.details, timestamp]
      );
    } catch (e) {
      console.error('[PostgresRepo.logAudit Error]:', (e as Error)?.message);
    }
    return {
      audit_id,
      ...entry,
      timestamp
    };
  }

  public async getAuditLogs(allowedVillageIds?: string[] | null): Promise<AuditLog[]> {
    let sql = 'SELECT * FROM audit_logs';
    const params: any[] = [];
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      sql += ' WHERE village_id = ANY($1) OR village_id IS NULL';
      params.push(allowedVillageIds);
    }
    sql += ' ORDER BY timestamp DESC LIMIT 200';
    const res = await this.pool.query(sql, params);
    return res.rows;
  }

  // --- Users ---
  public async findUserById(userId: string): Promise<ServerUser | undefined> {
    const res = await this.pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    return res.rows[0];
  }

  public async findUserByMobile(mobile: string): Promise<ServerUser | undefined> {
    const res = await this.pool.query('SELECT * FROM users WHERE mobile = $1', [mobile]);
    return res.rows[0];
  }

  public async findUserByVoterId(voterId: string): Promise<ServerUser | undefined> {
    const res = await this.pool.query('SELECT * FROM users WHERE UPPER(voter_id) = UPPER($1)', [voterId]);
    return res.rows[0];
  }

  public async findUserByEmail(email: string): Promise<ServerUser | undefined> {
    const res = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return res.rows[0];
  }

  public async getAllUsers(): Promise<ServerUser[]> {
    const res = await this.pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return res.rows;
  }

  public async isSuperAdminInitialized(): Promise<boolean> {
    const res = await this.pool.query(
      "SELECT 1 FROM users WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE' LIMIT 1"
    );
    return res.rows.length > 0;
  }

  public async setupSuperAdmin(params: {
    name: string;
    mobile: string;
    email?: string;
    password?: string;
    profile_photo?: string;
  }): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    return withTransaction(async (client) => {
      const existingAdmin = await client.query("SELECT * FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1");
      const defaultPassword = params.password || process.env.SUPER_ADMIN_PASSWORD || 'SindhanurAC58@2025';
      const { hash, salt } = hashPassword(defaultPassword);
      const now = new Date().toISOString();

      if (existingAdmin.rows.length > 0) {
        const adminId = existingAdmin.rows[0].user_id;
        const res = await client.query(
          `UPDATE users SET name = $1, mobile = $2, email = $3, password_hash = $4, password_salt = $5, status = 'ACTIVE', updated_at = $6
           WHERE user_id = $7 RETURNING *`,
          [params.name, params.mobile, params.email || null, hash, salt, now, adminId]
        );
        return { success: true, user: res.rows[0] };
      }

      const userId = 'USR_SUPER_01';
      const res = await client.query(
        `INSERT INTO users (user_id, name, mobile, email, voter_id, role, status, village_id, gp_id, taluk_id, constituency_id, password_hash, password_salt, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'SUPER_ADMIN', 'ACTIVE', NULL, NULL, 'TLK_SND', 'AC58', $6, $7, $8, $8)
         RETURNING *`,
        [userId, params.name, params.mobile, params.email || null, 'KA050580000001', hash, salt, now]
      );

      return { success: true, user: res.rows[0] };
    });
  }

  public async registerUser(params: {
    name: string;
    name_kannada?: string;
    mobile: string;
    email?: string;
    voter_id: string;
    dob?: string;
    gender?: string;
    address?: string;
    profile_photo?: string;
    village_id: string;
    password?: string;
  }): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    return withTransaction(async (client) => {
      // 1. Check duplicate mobile
      const mobCheck = await client.query('SELECT user_id FROM users WHERE mobile = $1', [params.mobile]);
      if (mobCheck.rows.length > 0) {
        return { success: false, error: 'A voter account with this mobile number is already registered.' };
      }

      // 2. Check duplicate voter ID
      const voterCheck = await client.query('SELECT user_id FROM users WHERE UPPER(voter_id) = UPPER($1)', [params.voter_id]);
      if (voterCheck.rows.length > 0) {
        return { success: false, error: 'A voter account with this Voter ID is already registered.' };
      }

      // 3. Verify village exists
      const villageRes = await client.query('SELECT * FROM villages WHERE village_id = $1', [params.village_id]);
      if (villageRes.rows.length === 0) {
        return { success: false, error: 'Selected village is not recognized within Sindhanur AC-58.' };
      }
      const village = villageRes.rows[0];

      let hash = '';
      let salt = '';
      if (params.password) {
        const hashed = hashPassword(params.password);
        hash = hashed.hash;
        salt = hashed.salt;
      }

      const userId = generateSecureId('USR');
      const now = new Date().toISOString();

      const insertRes = await client.query(
        `INSERT INTO users (
           user_id, name, name_kannada, mobile, email, voter_id, role, status,
           village_id, gp_id, taluk_id, constituency_id, password_hash, password_salt,
           dob, gender, address, profile_photo, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'MEMBER', 'PENDING', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING *`,
        [
          userId, params.name, params.name_kannada || null, params.mobile, params.email || null,
          params.voter_id.toUpperCase().trim(), village.village_id, village.gp_id, village.taluk_id,
          village.constituency_id, hash, salt, params.dob || null, params.gender || null, params.address || null, params.profile_photo || null, now
        ]
      );

      const newUser = insertRes.rows[0];

      // Audit log
      const auditId = generateSecureId('AUD');
      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, 'MEMBER', 'VOTER_REGISTRATION', 'USER', $2, $4, $5, $6)`,
        [auditId, userId, params.name, village.village_id, `Voter registration submitted for ${village.village_name}`, now]
      );

      return { success: true, user: newUser };
    });
  }

  public async approveMember(userId: string, adminUser: User): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    return withTransaction(async (client) => {
      const uRes = await client.query('SELECT * FROM users WHERE user_id = $1 FOR UPDATE', [userId]);
      if (uRes.rows.length === 0) return { success: false, error: 'User not found.' };
      const user = uRes.rows[0];

      if (user.role === 'SUPER_ADMIN') {
        return { success: false, error: 'Cannot alter Super Admin status.' };
      }

      const now = new Date().toISOString();
      const updateRes = await client.query(
        `UPDATE users SET status = 'ACTIVE', updated_at = $1 WHERE user_id = $2 RETURNING *`,
        [now, userId]
      );

      const updatedUser = updateRes.rows[0];

      // Audit log
      const auditId = generateSecureId('AUD');
      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'MEMBER_APPROVED', 'USER', $5, $6, $7, $8)`,
        [auditId, adminUser.user_id, adminUser.name, adminUser.role, userId, user.village_id, `Member registration approved for ${user.name} (${user.mobile})`, now]
      );

      // Notification
      const notifId = generateSecureId('NTF');
      await client.query(
        `INSERT INTO notifications (notification_id, user_id, title, message, type, is_read, created_at)
         VALUES ($1, $2, 'Account Approved', 'Your voter registration for Sindhanur AC-58 has been approved. You may now log in.', 'SUCCESS', false, $3)`,
        [notifId, userId, now]
      );

      return { success: true, user: updatedUser };
    });
  }

  public async rejectMember(userId: string, adminUser: User): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    return withTransaction(async (client) => {
      const uRes = await client.query('SELECT * FROM users WHERE user_id = $1 FOR UPDATE', [userId]);
      if (uRes.rows.length === 0) return { success: false, error: 'User not found.' };
      const user = uRes.rows[0];

      if (user.role === 'SUPER_ADMIN') {
        return { success: false, error: 'Cannot reject Super Admin.' };
      }

      const now = new Date().toISOString();
      const updateRes = await client.query(
        `UPDATE users SET status = 'REJECTED', updated_at = $1 WHERE user_id = $2 RETURNING *`,
        [now, userId]
      );

      // Invalidate any sessions
      await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

      const auditId = generateSecureId('AUD');
      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'MEMBER_REJECTED', 'USER', $5, $6, $7, $8)`,
        [auditId, adminUser.user_id, adminUser.name, adminUser.role, userId, user.village_id, `Member registration rejected for ${user.name} (${user.mobile})`, now]
      );

      return { success: true, user: updateRes.rows[0] };
    });
  }

  /**
   * Promotes a verified active member to Village Head.
   * STRICT CONCURRENCY REQUIREMENT:
   * - One active Village Head per village enforced via row lock, transaction, and PostgreSQL partial unique index.
   */
  public async promoteToVillageHead(userId: string, targetVillageId: string, adminUser: User): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    return withTransaction(async (client) => {
      // 1. Lock village row to serialize concurrent promotions for the same village
      const vRes = await client.query('SELECT * FROM villages WHERE village_id = $1 FOR UPDATE', [targetVillageId]);
      if (vRes.rows.length === 0) {
        return { success: false, error: 'Village not found.' };
      }
      const targetVillage = vRes.rows[0];

      // 2. Lock and check candidate user
      const uRes = await client.query('SELECT * FROM users WHERE user_id = $1 FOR UPDATE', [userId]);
      if (uRes.rows.length === 0) {
        return { success: false, error: 'User not found.' };
      }
      const candidate = uRes.rows[0];

      if (candidate.status !== 'ACTIVE') {
        return { success: false, error: 'Only approved ACTIVE members can be appointed as Village Head.' };
      }

      // 3. Concurrency check: Ensure no other active Village Head exists for this village
      const existingHeadRes = await client.query(
        `SELECT user_id, name FROM users
         WHERE village_id = $1 AND role = 'VILLAGE_HEAD' AND status = 'ACTIVE' AND user_id != $2`,
        [targetVillageId, userId]
      );

      if (existingHeadRes.rows.length > 0) {
        const currentHead = existingHeadRes.rows[0];
        return {
          success: false,
          error: `Village '${targetVillage.village_name}' already has an active Village Head (${currentHead.name}). Please demote or reassign them first.`
        };
      }

      const now = new Date().toISOString();

      // 4. Update user to VILLAGE_HEAD
      const updateRes = await client.query(
        `UPDATE users SET role = 'VILLAGE_HEAD', village_id = $1, gp_id = $2, updated_at = $3
         WHERE user_id = $4 RETURNING *`,
        [targetVillageId, targetVillage.gp_id, now, userId]
      );

      // Invalidate sessions so new permissions take effect
      await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

      // 5. Audit Log
      const auditId = generateSecureId('AUD');
      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'VILLAGE_HEAD_PROMOTED', 'USER', $5, $6, $7, $8)`,
        [auditId, adminUser.user_id, adminUser.name, adminUser.role, userId, targetVillageId, `Promoted ${candidate.name} (${candidate.mobile}) to Village Head for ${targetVillage.village_name}`, now]
      );

      // 6. Notification
      const notifId = generateSecureId('NTF');
      await client.query(
        `INSERT INTO notifications (notification_id, user_id, title, message, type, is_read, created_at)
         VALUES ($1, $2, 'Appointed as Village Head', $3, 'INFO', false, $4)`,
        [notifId, userId, `You have been appointed as Village Head for ${targetVillage.village_name}. You now have village administration privileges.`, now]
      );

      return { success: true, user: updateRes.rows[0] };
    });
  }

  public async demoteToMember(userId: string, adminUser: User): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    return withTransaction(async (client) => {
      const uRes = await client.query('SELECT * FROM users WHERE user_id = $1 FOR UPDATE', [userId]);
      if (uRes.rows.length === 0) return { success: false, error: 'User not found.' };
      const user = uRes.rows[0];

      if (user.role !== 'VILLAGE_HEAD') {
        return { success: false, error: 'User is not currently a Village Head.' };
      }

      const now = new Date().toISOString();
      const updateRes = await client.query(
        `UPDATE users SET role = 'MEMBER', updated_at = $1 WHERE user_id = $2 RETURNING *`,
        [now, userId]
      );

      // Invalidate sessions
      await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

      const auditId = generateSecureId('AUD');
      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'VILLAGE_HEAD_DEMOTED', 'USER', $5, $6, $7, $8)`,
        [auditId, adminUser.user_id, adminUser.name, adminUser.role, userId, user.village_id, `Demoted ${user.name} from Village Head to Member`, now]
      );

      return { success: true, user: updateRes.rows[0] };
    });
  }

  public async reassignVillageHead(userId: string, newVillageId: string, adminUser: User): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    return withTransaction(async (client) => {
      // 1. Lock new village
      const vRes = await client.query('SELECT * FROM villages WHERE village_id = $1 FOR UPDATE', [newVillageId]);
      if (vRes.rows.length === 0) return { success: false, error: 'Target village not found.' };
      const newVillage = vRes.rows[0];

      // 2. Lock user
      const uRes = await client.query('SELECT * FROM users WHERE user_id = $1 FOR UPDATE', [userId]);
      if (uRes.rows.length === 0) return { success: false, error: 'User not found.' };
      const user = uRes.rows[0];

      if (user.role !== 'VILLAGE_HEAD') {
        return { success: false, error: 'User must be a Village Head to be reassigned.' };
      }

      // 3. Concurrency check: Ensure target village has no active Village Head
      const existingHeadRes = await client.query(
        `SELECT user_id, name FROM users
         WHERE village_id = $1 AND role = 'VILLAGE_HEAD' AND status = 'ACTIVE' AND user_id != $2`,
        [newVillageId, userId]
      );

      if (existingHeadRes.rows.length > 0) {
        return {
          success: false,
          error: `Target village '${newVillage.village_name}' already has an active Village Head (${existingHeadRes.rows[0].name}).`
        };
      }

      const now = new Date().toISOString();
      const updateRes = await client.query(
        `UPDATE users SET village_id = $1, gp_id = $2, updated_at = $3 WHERE user_id = $4 RETURNING *`,
        [newVillageId, newVillage.gp_id, now, userId]
      );

      // Invalidate sessions
      await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

      const auditId = generateSecureId('AUD');
      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'VILLAGE_HEAD_REASSIGNED', 'USER', $5, $6, $7, $8)`,
        [auditId, adminUser.user_id, adminUser.name, adminUser.role, userId, newVillageId, `Reassigned Village Head ${user.name} to ${newVillage.village_name}`, now]
      );

      return { success: true, user: updateRes.rows[0] };
    });
  }

  public async deleteUser(userId: string, adminUser: User): Promise<{ success: boolean; error?: string }> {
    return withTransaction(async (client) => {
      if (adminUser.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Forbidden: Only Super Admin can delete users.' };
      }
      if (userId === adminUser.user_id) {
        return { success: false, error: 'Cannot delete yourself.' };
      }

      const uRes = await client.query('SELECT * FROM users WHERE user_id = $1 FOR UPDATE', [userId]);
      if (uRes.rows.length === 0) return { success: false, error: 'User not found.' };
      const targetUser = uRes.rows[0];

      // Invalidate sessions
      await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      // Delete user
      await client.query('DELETE FROM users WHERE user_id = $1', [userId]);

      const auditId = generateSecureId('AUD');
      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'DELETE', 'USER', $5, $6, $7, NOW())`,
        [auditId, adminUser.user_id, adminUser.name, adminUser.role, userId, targetUser.village_id, `Deleted user ${targetUser.name} (${targetUser.role})`]
      );

      return { success: true };
    });
  }

  public async updateUserByAdmin(
    userId: string,
    updates: {
      name?: string;
      name_kannada?: string;
      mobile?: string;
      voter_id?: string;
      role?: any;
      village_id?: string | null;
      status?: any;
      email?: string;
      address?: string;
    },
    adminUser: User
  ): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    return withTransaction(async (client) => {
      if (adminUser.role !== 'SUPER_ADMIN') {
        return { success: false, error: 'Forbidden: Only Super Admin can edit users.' };
      }

      const uRes = await client.query('SELECT * FROM users WHERE user_id = $1 FOR UPDATE', [userId]);
      if (uRes.rows.length === 0) return { success: false, error: 'User not found.' };
      const current = uRes.rows[0];

      const newRole = updates.role ?? current.role;
      const newVillageId = updates.village_id !== undefined ? updates.village_id : current.village_id;
      const newStatus = updates.status ?? current.status;

      // Never allow the last active Super Admin to lose admin access.
      if (current.role === 'SUPER_ADMIN' && (newRole !== 'SUPER_ADMIN' || newStatus !== 'ACTIVE')) {
        const adminCountRes = await client.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'SUPER_ADMIN' AND status = 'ACTIVE'`);
        if (adminCountRes.rows[0].count <= 1) {
          return { success: false, error: 'Cannot demote or deactivate the last active Super Admin.' };
        }
      }

      // If becoming an ACTIVE Village Head, enforce single active village head rule
      if (newRole === 'VILLAGE_HEAD' && newStatus === 'ACTIVE') {
        if (!newVillageId) {
          return { success: false, error: 'A Village Head must be assigned to exactly one village.' };
        }
        const existingHead = await client.query(
          `SELECT user_id, name FROM users WHERE village_id = $1 AND role = 'VILLAGE_HEAD' AND status = 'ACTIVE' AND user_id != $2`,
          [newVillageId, userId]
        );
        if (existingHead.rows.length > 0) {
          return {
            success: false,
            error: `Village already has an active Village Head (${existingHead.rows[0].name}). Please demote or reassign them first.`
          };
        }
      }

      let gpId = current.gp_id;
      if (newVillageId && newVillageId !== current.village_id) {
        const vRes = await client.query('SELECT gp_id FROM villages WHERE village_id = $1', [newVillageId]);
        if (vRes.rows.length > 0) {
          gpId = vRes.rows[0].gp_id;
        }
      } else if (!newVillageId) {
        gpId = null;
      }

      const res = await client.query(
        `UPDATE users SET
           name = COALESCE($1, name),
           name_kannada = COALESCE($2, name_kannada),
           mobile = COALESCE($3, mobile),
           voter_id = COALESCE($4, voter_id),
           role = COALESCE($5, role),
           village_id = $6,
           gp_id = $7,
           status = COALESCE($8, status),
           email = COALESCE($9, email),
           address = COALESCE($10, address),
           updated_at = NOW()
         WHERE user_id = $11 RETURNING *`,
        [
          updates.name,
          updates.name_kannada,
          updates.mobile,
          updates.voter_id,
          newRole,
          newVillageId,
          gpId,
          newStatus,
          updates.email,
          updates.address,
          userId
        ]
      );

      // Invalidate target user's session if role, status or village changed
      if (newRole !== current.role || newStatus !== current.status || newVillageId !== current.village_id) {
        await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      }

      const auditId = generateSecureId('AUD');
      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'UPDATE', 'USER', $5, $6, $7, NOW())`,
        [auditId, adminUser.user_id, adminUser.name, adminUser.role, userId, newVillageId || current.village_id, `Admin updated user ${current.name} details.`]
      );

      return { success: true, user: res.rows[0] };
    });
  }

  public async resetPassword(params: {
    mobile: string;
    voter_id: string;
    new_password: string;
  }): Promise<{ success: boolean; error?: string }> {
    return withTransaction(async (client) => {
      const uRes = await client.query(
        'SELECT * FROM users WHERE mobile = $1 AND UPPER(voter_id) = UPPER($2) FOR UPDATE',
        [params.mobile, params.voter_id]
      );
      if (uRes.rows.length === 0) {
        return { success: false, error: 'No matching user found with the provided credentials.' };
      }
      const user = uRes.rows[0];

      const { hash, salt } = hashPassword(params.new_password);
      const now = new Date().toISOString();

      await client.query(
        'UPDATE users SET password_hash = $1, password_salt = $2, updated_at = $3 WHERE user_id = $4',
        [hash, salt, now, user.user_id]
      );

      // Invalidate existing sessions
      await client.query('DELETE FROM sessions WHERE user_id = $1', [user.user_id]);

      const auditId = generateSecureId('AUD');
      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'PASSWORD_RESET', 'USER', $2, $5, 'Password was reset via verified voter credentials', $6)`,
        [auditId, user.user_id, user.name, user.role, user.village_id, now]
      );

      return { success: true };
    });
  }

  public async setUserStatus(userId: string, status: UserStatus, adminUser: User): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    return withTransaction(async (client) => {
      const uRes = await client.query('SELECT * FROM users WHERE user_id = $1 FOR UPDATE', [userId]);
      if (uRes.rows.length === 0) return { success: false, error: 'User not found.' };
      const user = uRes.rows[0];

      if (user.role === 'SUPER_ADMIN') {
        return { success: false, error: 'Cannot modify Super Admin status.' };
      }

      const now = new Date().toISOString();
      const updateRes = await client.query(
        'UPDATE users SET status = $1, updated_at = $2 WHERE user_id = $3 RETURNING *',
        [status, now, userId]
      );

      if (status !== 'ACTIVE') {
        await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      }

      const auditId = generateSecureId('AUD');
      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'USER_STATUS_CHANGE', 'USER', $5, $6, $7, $8)`,
        [auditId, adminUser.user_id, adminUser.name, adminUser.role, userId, user.village_id, `Changed user status to ${status} for ${user.name}`, now]
      );

      return { success: true, user: updateRes.rows[0] };
    });
  }

  public async getUsersByFilter(filter: {
    role?: string;
    status?: string;
    village_id?: string;
    gp_id?: string;
    allowedVillageIds?: string[] | null;
  }): Promise<ServerUser[]> {
    let sql = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];
    let pIdx = 1;

    if (filter.role) {
      sql += ` AND role = $${pIdx++}`;
      params.push(filter.role);
    }
    if (filter.status) {
      sql += ` AND status = $${pIdx++}`;
      params.push(filter.status);
    }
    if (filter.village_id) {
      sql += ` AND village_id = $${pIdx++}`;
      params.push(filter.village_id);
    }
    if (filter.gp_id) {
      sql += ` AND gp_id = $${pIdx++}`;
      params.push(filter.gp_id);
    }
    if (filter.allowedVillageIds && filter.allowedVillageIds.length > 0) {
      sql += ` AND (village_id = ANY($${pIdx++}) OR role = 'SUPER_ADMIN')`;
      params.push(filter.allowedVillageIds);
    }

    sql += ' ORDER BY created_at DESC';
    const res = await this.pool.query(sql, params);
    return res.rows;
  }

  // --- Administrative Entities ---
  public async getConstituency(): Promise<Constituency> {
    const res = await this.pool.query('SELECT * FROM constituencies WHERE constituency_id = $1', ['AC58']);
    if (res.rows.length > 0) {
      const r = res.rows[0];
      return {
        constituency_id: r.constituency_id,
        name: r.name,
        name_kannada: r.name_kannada,
        code: 'AC-58',
        district: r.district,
        state: r.state,
        total_voters: 232000
      };
    }
    return {
      constituency_id: 'AC58',
      name: 'Sindhanur Assembly Constituency (AC-58)',
      name_kannada: 'ಸಿಂಧನೂರು ವಿಧಾನಸಭಾ ಕ್ಷೇತ್ರ (AC-58)',
      code: 'AC-58',
      district: 'Raichur',
      state: 'Karnataka',
      total_voters: 232000
    };
  }

  public async getTaluks(): Promise<Taluk[]> {
    const res = await this.pool.query('SELECT * FROM taluks');
    return res.rows.map(r => ({
      taluk_id: r.taluk_id,
      constituency_id: r.constituency_id,
      name: r.name,
      name_kannada: r.name_kannada,
      headquarters: 'Sindhanur'
    }));
  }

  public async getGramPanchayats(filterGpId?: string | null): Promise<GramPanchayat[]> {
    let sql = 'SELECT * FROM gram_panchayats';
    const params: any[] = [];
    if (filterGpId) {
      sql += ' WHERE gp_id = $1';
      params.push(filterGpId);
    }
    sql += ' ORDER BY gp_name ASC';
    const res = await this.pool.query(sql, params);
    return res.rows;
  }

  public async getGramPanchayatById(gpId: string): Promise<GramPanchayat | undefined> {
    const res = await this.pool.query('SELECT * FROM gram_panchayats WHERE gp_id = $1', [gpId]);
    return res.rows[0];
  }

  public async getVillages(allowedVillageIds?: string[] | null): Promise<Village[]> {
    let sql = 'SELECT * FROM villages';
    const params: any[] = [];
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      sql += ' WHERE village_id = ANY($1)';
      params.push(allowedVillageIds);
    }
    sql += ' ORDER BY village_name ASC';
    const res = await this.pool.query(sql, params);
    return res.rows;
  }

  public async getVillageById(villageId: string): Promise<Village | undefined> {
    const res = await this.pool.query('SELECT * FROM villages WHERE village_id = $1', [villageId]);
    return res.rows[0];
  }

  public async createVillage(village: Village, adminUser: User): Promise<Village> {
    const res = await this.pool.query(
      `INSERT INTO villages (village_id, village_name, kannada_name, gp_id, taluk_id, constituency_id, latitude, longitude, population, households, voter_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        village.village_id, village.village_name, village.kannada_name || village.village_name,
        village.gp_id, village.taluk_id || 'TLK_SND', village.constituency_id || 'AC58',
        village.latitude || 15.75, village.longitude || 76.75, village.population || 0,
        village.households || 0, village.voter_count || 0, village.status || 'ACTIVE'
      ]
    );
    await this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'CREATE',
      record_type: 'VILLAGE',
      record_id: village.village_id,
      village_id: village.village_id,
      details: `Created new village ${village.village_name}`
    });
    return res.rows[0];
  }

  public async updateVillage(villageId: string, updates: Partial<Village>, adminUser: User): Promise<Village | null> {
    const existing = await this.getVillageById(villageId);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    const res = await this.pool.query(
      `UPDATE villages SET
         village_name = $1, kannada_name = $2, gp_id = $3, latitude = $4, longitude = $5,
         population = $6, households = $7, voter_count = $8, status = $9
       WHERE village_id = $10 RETURNING *`,
      [
        merged.village_name, merged.kannada_name, merged.gp_id, merged.latitude, merged.longitude,
        merged.population, merged.households, merged.voter_count, merged.status, villageId
      ]
    );

    await this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'UPDATE',
      record_type: 'VILLAGE',
      record_id: villageId,
      village_id: villageId,
      details: `Updated village details for ${merged.village_name}`
    });
    return res.rows[0];
  }

  // --- Booths ---
  public async getBooths(villageId?: string | null): Promise<Booth[]> {
    let sql = 'SELECT * FROM booths';
    const params: any[] = [];
    if (villageId) {
      sql += ' WHERE village_id = $1';
      params.push(villageId);
    }
    sql += ' ORDER BY booth_number ASC';
    const res = await this.pool.query(sql, params);
    return res.rows;
  }

  public async getBoothById(boothId: string): Promise<Booth | undefined> {
    const res = await this.pool.query('SELECT * FROM booths WHERE booth_id = $1', [boothId]);
    return res.rows[0];
  }

  public async createBooth(booth: Booth, adminUser: User): Promise<Booth> {
    const res = await this.pool.query(
      `INSERT INTO booths (booth_id, booth_number, polling_station_name, kannada_name, village_id, gp_id, location, latitude, longitude, voters_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        booth.booth_id,
        booth.booth_number,
        booth.polling_station_name,
        booth.kannada_name || null,
        booth.village_id,
        booth.gp_id || null,
        booth.location || null,
        booth.latitude || null,
        booth.longitude || null,
        booth.voters_count || 0,
        booth.status || 'ACTIVE'
      ]
    );
    await this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'CREATE',
      record_type: 'BOOTH',
      record_id: booth.booth_id,
      village_id: booth.village_id,
      details: `Created booth ${booth.booth_number} - ${booth.polling_station_name}`
    });
    return res.rows[0];
  }

  // --- Issues ---
  public async getIssues(allowedVillageIds?: string[] | null): Promise<Issue[]> {
    let sql = 'SELECT * FROM issues';
    const params: any[] = [];
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      sql += ' WHERE village_id = ANY($1)';
      params.push(allowedVillageIds);
    }
    sql += ' ORDER BY created_at DESC';
    const res = await this.pool.query(sql, params);
    return res.rows;
  }

  public async getIssueById(issueId: string): Promise<Issue | undefined> {
    const res = await this.pool.query('SELECT * FROM issues WHERE issue_id = $1', [issueId]);
    return res.rows[0];
  }

  public async getIssueUpdates(issueId: string): Promise<IssueUpdate[]> {
    const res = await this.pool.query('SELECT * FROM issue_updates WHERE issue_id = $1 ORDER BY created_at ASC', [issueId]);
    return res.rows;
  }

  public async createIssue(issue: Issue, user: User): Promise<Issue> {
    return withTransaction(async (client) => {
      const now = new Date().toISOString();
      const res = await client.query(
        `INSERT INTO issues (
           issue_id, title, description, category, priority, status, village_id, gp_id,
           location, latitude, longitude, created_by, created_by_name, assigned_to, assigned_to_name,
           photos, documents, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $18) RETURNING *`,
        [
          issue.issue_id,
          issue.title,
          issue.description,
          issue.category,
          issue.priority,
          issue.status || 'SUBMITTED',
          issue.village_id,
          issue.gp_id || null,
          issue.location || '',
          issue.latitude || null,
          issue.longitude || null,
          issue.created_by,
          issue.created_by_name || user.name,
          issue.assigned_to || null,
          issue.assigned_to_name || null,
          JSON.stringify(issue.photos || []),
          JSON.stringify(issue.documents || []),
          now
        ]
      );

      const updateId = generateSecureId('UPD');
      await client.query(
        `INSERT INTO issue_updates (update_id, issue_id, village_id, user_id, user_name, previous_status, new_status, remarks, timestamp, created_at)
         VALUES ($1, $2, $3, $4, $5, NULL, $6, 'Issue reported initially', $7, $7)`,
        [updateId, issue.issue_id, issue.village_id, user.user_id, user.name, issue.status || 'SUBMITTED', now]
      );

      const auditId = generateSecureId('AUD');
      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'CREATE', 'ISSUE', $5, $6, $7, $8)`,
        [auditId, user.user_id, user.name, user.role, issue.issue_id, issue.village_id, `Created civic issue: ${issue.title} in village ${issue.village_id}`, now]
      );

      return res.rows[0];
    });
  }

  public async updateIssueStatus(
    issueId: string,
    status: any,
    remarks: string,
    user: User,
    assignedTo?: string,
    assignedToName?: string
  ): Promise<Issue | null> {
    return withTransaction(async (client) => {
      const iRes = await client.query('SELECT * FROM issues WHERE issue_id = $1 FOR UPDATE', [issueId]);
      if (iRes.rows.length === 0) return null;
      const issue = iRes.rows[0];

      const now = new Date().toISOString();
      const resolvedAt = status === 'RESOLVED' ? now : issue.resolved_at;
      const newAssignedTo = assignedTo !== undefined ? (assignedTo || null) : issue.assigned_to;
      const newAssignedToName = assignedToName !== undefined ? (assignedToName || null) : issue.assigned_to_name;

      const updateRes = await client.query(
        `UPDATE issues SET status = $1, updated_at = $2, resolved_at = $3, assigned_to = $4, assigned_to_name = $5 WHERE issue_id = $6 RETURNING *`,
        [status, now, resolvedAt, newAssignedTo, newAssignedToName, issueId]
      );

      const updateId = generateSecureId('UPD');
      await client.query(
        `INSERT INTO issue_updates (update_id, issue_id, village_id, user_id, user_name, previous_status, new_status, remarks, timestamp, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
        [updateId, issueId, issue.village_id, user.user_id, user.name, issue.status, status, remarks, now]
      );

      const auditId = generateSecureId('AUD');
      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'STATUS_CHANGE', 'ISSUE', $5, $6, $7, $8)`,
        [auditId, user.user_id, user.name, user.role, issueId, issue.village_id, `Changed issue status from ${issue.status} to ${status}: ${remarks}`, now]
      );

      return updateRes.rows[0];
    });
  }

  public async deleteIssue(issueId: string, user: User): Promise<boolean> {
    const iRes = await this.pool.query('SELECT village_id, title FROM issues WHERE issue_id = $1', [issueId]);
    const villageId = iRes.rows[0]?.village_id;
    const title = iRes.rows[0]?.title || issueId;
    const res = await this.pool.query('DELETE FROM issues WHERE issue_id = $1', [issueId]);
    await this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'DELETE',
      record_type: 'ISSUE',
      record_id: issueId,
      village_id: villageId,
      details: `Deleted issue ${title} from village ${villageId}`
    });
    return (res.rowCount ?? 0) > 0;
  }

  // --- Development Projects ---
  public async getProjects(allowedVillageIds?: string[] | null): Promise<DevelopmentProject[]> {
    let sql = 'SELECT * FROM development_projects';
    const params: any[] = [];
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      sql += ' WHERE village_id = ANY($1)';
      params.push(allowedVillageIds);
    }
    sql += ' ORDER BY created_at DESC';
    const res = await this.pool.query(sql, params);
    return res.rows;
  }

  public async getProjectById(projectId: string): Promise<DevelopmentProject | undefined> {
    const res = await this.pool.query('SELECT * FROM development_projects WHERE project_id = $1', [projectId]);
    return res.rows[0];
  }

  public async getProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
    const res = await this.pool.query('SELECT * FROM project_updates WHERE project_id = $1 ORDER BY created_at ASC', [projectId]);
    return res.rows;
  }

  public async createProject(project: DevelopmentProject, user: User): Promise<DevelopmentProject> {
    const now = new Date().toISOString();
    const res = await this.pool.query(
      `INSERT INTO development_projects (
         project_id, project_name, project_name_kannada, department, description,
         estimated_cost, approved_cost, status, village_id, gp_id, start_date,
         expected_completion, progress_percentage, contractor_name, photos, documents, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17) RETURNING *`,
      [
        project.project_id,
        project.project_name,
        project.project_name_kannada || null,
        project.department,
        project.description,
        project.estimated_cost || 0,
        project.approved_cost || 0,
        project.status,
        project.village_id,
        project.gp_id || null,
        project.start_date || null,
        project.expected_completion || null,
        project.progress_percentage || 0,
        project.contractor_name || null,
        JSON.stringify(project.photos || []),
        JSON.stringify(project.documents || []),
        now
      ]
    );

    await this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'PROJECT',
      record_id: project.project_id,
      village_id: project.village_id,
      details: `Created development project: ${project.project_name} (Budget: ₹${project.estimated_cost})`
    });

    return res.rows[0];
  }

  public async updateProjectProgress(projectId: string, progress: number, remarks: string, user: User): Promise<DevelopmentProject | null> {
    return withTransaction(async (client) => {
      const pRes = await client.query('SELECT * FROM development_projects WHERE project_id = $1 FOR UPDATE', [projectId]);
      if (pRes.rows.length === 0) return null;
      const project = pRes.rows[0];

      const now = new Date().toISOString();
      const status = progress >= 100 ? 'COMPLETED' : project.status;

      const updateRes = await client.query(
        `UPDATE development_projects SET progress_percentage = $1, status = $2, updated_at = $3
         WHERE project_id = $4 RETURNING *`,
        [progress, status, now, projectId]
      );

      const updateId = generateSecureId('PUD');
      await client.query(
        `INSERT INTO project_updates (update_id, project_id, village_id, user_id, progress_percentage, remarks, timestamp, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
        [updateId, projectId, project.village_id, user.user_id, progress, remarks, now]
      );

      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'UPDATE', 'PROJECT', $5, $6, $7, $8)`,
        [generateSecureId('AUD'), user.user_id, user.name, user.role, projectId, project.village_id, `Updated project ${project.project_name}. Progress: ${progress}%`, now]
      );

      return updateRes.rows[0];
    });
  }

  // --- Field Visits ---
  public async getFieldVisits(allowedVillageIds?: string[] | null): Promise<FieldVisit[]> {
    let sql = 'SELECT * FROM field_visits';
    const params: any[] = [];
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      sql += ' WHERE village_id = ANY($1)';
      params.push(allowedVillageIds);
    }
    sql += ' ORDER BY created_at DESC';
    const res = await this.pool.query(sql, params);
    return res.rows;
  }

  public async createFieldVisit(visit: FieldVisit, user: User): Promise<FieldVisit> {
    const now = new Date().toISOString();
    const res = await this.pool.query(
      `INSERT INTO field_visits (
         visit_id, village_id, gp_id, user_id, user_name, date, time, location,
         purpose, notes, observations, photos, issues_identified, follow_up_required,
         follow_up_needed, latitude, longitude, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
      [
        visit.visit_id,
        visit.village_id,
        visit.gp_id || null,
        visit.user_id,
        visit.user_name,
        visit.date,
        visit.time || null,
        visit.location,
        visit.purpose,
        visit.notes,
        visit.observations || null,
        JSON.stringify(visit.photos || []),
        JSON.stringify(visit.issues_identified || []),
        visit.follow_up_required || false,
        visit.follow_up_needed || false,
        visit.latitude || null,
        visit.longitude || null,
        now
      ]
    );

    await this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'VISIT',
      record_id: visit.visit_id,
      village_id: visit.village_id,
      details: `Logged field visit to village ${visit.village_id} on ${visit.date}`
    });

    return res.rows[0];
  }

  // --- Meetings ---
  public async getMeetings(allowedVillageIds?: string[] | null): Promise<VillageMeeting[]> {
    let sql = 'SELECT * FROM meetings';
    const params: any[] = [];
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      sql += ' WHERE village_id = ANY($1)';
      params.push(allowedVillageIds);
    }
    sql += ' ORDER BY created_at DESC';
    const res = await this.pool.query(sql, params);
    return res.rows;
  }

  public async createMeeting(meeting: VillageMeeting, user: User): Promise<VillageMeeting> {
    const now = new Date().toISOString();
    const attendeesCount = typeof meeting.attendees === 'number'
      ? meeting.attendees
      : (Array.isArray(meeting.attendees) ? meeting.attendees.length : 0);

    const res = await this.pool.query(
      `INSERT INTO meetings (
         meeting_id, village_id, gp_id, title, date, time, location, agenda,
         participants, attendees, decisions, follow_up_tasks, documents, status, created_by, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        meeting.meeting_id,
        meeting.village_id,
        meeting.gp_id || null,
        meeting.title,
        meeting.date,
        meeting.time || null,
        meeting.location,
        meeting.agenda,
        JSON.stringify(meeting.participants || []),
        attendeesCount,
        meeting.decisions || '',
        JSON.stringify(meeting.follow_up_tasks || []),
        JSON.stringify(meeting.documents || []),
        meeting.status,
        meeting.created_by,
        now
      ]
    );

    await this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'MEETING',
      record_id: meeting.meeting_id,
      village_id: meeting.village_id,
      details: `Scheduled in-person meeting: ${meeting.title} in village ${meeting.village_id}`
    });

    return res.rows[0];
  }

  // --- Video Meetings ---
  public async getVideoMeetings(allowedVillageIds?: string[] | null): Promise<VideoMeeting[]> {
    let sql = 'SELECT * FROM video_meetings';
    const params: any[] = [];
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      sql += ' WHERE village_id = ANY($1)';
      params.push(allowedVillageIds);
    }
    sql += ' ORDER BY created_at DESC';
    const res = await this.pool.query(sql, params);
    const meetings: VideoMeeting[] = [];
    for (const m of res.rows) {
      const partRes = await this.pool.query('SELECT * FROM video_participants WHERE meeting_id = $1', [m.meeting_id]);
      meetings.push({ ...m, participants: partRes.rows });
    }
    return meetings;
  }

  public async getVideoMeetingById(meetingId: string): Promise<VideoMeeting | undefined> {
    const res = await this.pool.query('SELECT * FROM video_meetings WHERE meeting_id = $1', [meetingId]);
    if (res.rows.length === 0) return undefined;
    const meeting = res.rows[0];
    const partRes = await this.pool.query('SELECT * FROM video_participants WHERE meeting_id = $1', [meetingId]);
    meeting.participants = partRes.rows;
    return meeting;
  }

  public async createVideoMeeting(meeting: VideoMeeting, user: User): Promise<VideoMeeting> {
    const now = new Date().toISOString();
    const res = await this.pool.query(
      `INSERT INTO video_meetings (
         meeting_id, title, description, village_id, host_user_id, created_by,
         scheduled_at, status, meeting_type, allow_screen_share, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11) RETURNING *`,
      [
        meeting.meeting_id,
        meeting.title,
        meeting.description,
        meeting.village_id,
        meeting.host_user_id,
        meeting.created_by,
        meeting.scheduled_at,
        meeting.status,
        meeting.meeting_type || 'VILLAGE_MEETING',
        meeting.allow_screen_share !== false,
        now
      ]
    );

    await this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'VIDEO_CONFERENCE',
      record_id: meeting.meeting_id,
      village_id: meeting.village_id,
      details: `Village Head (${user.name}) scheduled video conference '${meeting.title}' for village ${meeting.village_id}.`
    });

    const created = res.rows[0];
    created.participants = [];
    return created;
  }

  public async updateVideoMeeting(meetingId: string, updates: Partial<VideoMeeting>, user: User): Promise<VideoMeeting | null> {
    const existing = await this.getVideoMeetingById(meetingId);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    await this.pool.query(
      `UPDATE video_meetings SET title = $1, description = $2, status = $3, started_at = $4, ended_at = $5, updated_at = NOW()
       WHERE meeting_id = $6`,
      [merged.title, merged.description, merged.status, merged.started_at || null, merged.ended_at || null, meetingId]
    );

    await this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'UPDATE',
      record_type: 'VIDEO_CONFERENCE',
      record_id: meetingId,
      village_id: existing.village_id,
      details: `Updated video conference ${merged.title}. Status: ${merged.status}`
    });

    return this.getVideoMeetingById(meetingId) as Promise<VideoMeeting>;
  }

  public async joinVideoMeeting(meetingId: string, participant: VideoParticipant): Promise<VideoMeeting | null> {
    await this.pool.query(
      `INSERT INTO video_participants (meeting_id, user_id, name, role, is_muted, can_speak, is_hand_raised, is_video_enabled, joined_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (meeting_id, user_id) DO UPDATE SET
         is_muted = EXCLUDED.is_muted,
         can_speak = EXCLUDED.can_speak,
         is_hand_raised = EXCLUDED.is_hand_raised,
         is_video_enabled = EXCLUDED.is_video_enabled`,
      [
        meetingId,
        participant.user_id,
        participant.name,
        participant.role,
        participant.is_muted ?? false,
        participant.can_speak ?? true,
        participant.is_hand_raised ?? false,
        participant.is_video_enabled ?? true
      ]
    );
    return this.getVideoMeetingById(meetingId) as Promise<VideoMeeting>;
  }

  public async leaveVideoMeeting(meetingId: string, userId: string): Promise<VideoMeeting | null> {
    await this.pool.query('DELETE FROM video_participants WHERE meeting_id = $1 AND user_id = $2', [meetingId, userId]);
    return this.getVideoMeetingById(meetingId) as Promise<VideoMeeting>;
  }

  public async updateParticipantState(meetingId: string, userId: string, updates: Partial<VideoParticipant>): Promise<VideoMeeting | null> {
    await this.pool.query(
      `UPDATE video_participants SET
         is_muted = COALESCE($1, is_muted),
         can_speak = COALESCE($2, can_speak),
         is_hand_raised = COALESCE($3, is_hand_raised),
         is_video_enabled = COALESCE($4, is_video_enabled)
       WHERE meeting_id = $5 AND user_id = $6`,
      [updates.is_muted, updates.can_speak, updates.is_hand_raised, updates.is_video_enabled, meetingId, userId]
    );
    return this.getVideoMeetingById(meetingId) as Promise<VideoMeeting>;
  }

  // --- Jitsi Video Conferences (Conferences & Participants) ---
  public async getConferences(user: User): Promise<Conference[]> {
    let sql: string;
    let params: any[] = [];

    if (user.role === 'SUPER_ADMIN') {
      // Super Admin can view all constituency conferences
      sql = `
        SELECT c.id, c.title, c.description, c.village_id, c.created_by,
               c.scheduled_date, c.scheduled_time, c.duration, c.status,
               c.created_at, c.started_at, c.ended_at,
               v.village_name, u.name as created_by_name,
               (SELECT COUNT(*) FROM conference_participants cp WHERE cp.conference_id = c.id) as participants_count
        FROM conferences c
        LEFT JOIN villages v ON c.village_id = v.village_id
        LEFT JOIN users u ON c.created_by = u.user_id
        ORDER BY c.scheduled_date DESC, c.scheduled_time DESC, c.created_at DESC
      `;
    } else if (user.role === 'VILLAGE_HEAD') {
      // Village Head sees conferences for their assigned village
      sql = `
        SELECT c.id, c.title, c.description, c.village_id, c.created_by,
               c.scheduled_date, c.scheduled_time, c.duration, c.status,
               c.created_at, c.started_at, c.ended_at,
               v.village_name, u.name as created_by_name,
               (SELECT COUNT(*) FROM conference_participants cp WHERE cp.conference_id = c.id) as participants_count
        FROM conferences c
        LEFT JOIN villages v ON c.village_id = v.village_id
        LEFT JOIN users u ON c.created_by = u.user_id
        WHERE c.village_id = $1
        ORDER BY c.scheduled_date DESC, c.scheduled_time DESC, c.created_at DESC
      `;
      params = [user.village_id];
    } else {
      // Member sees ONLY conferences they are invited to in their village
      sql = `
        SELECT c.id, c.title, c.description, c.village_id, c.created_by,
               c.scheduled_date, c.scheduled_time, c.duration, c.status,
               c.created_at, c.started_at, c.ended_at,
               v.village_name, u.name as created_by_name,
               (SELECT COUNT(*) FROM conference_participants cp WHERE cp.conference_id = c.id) as participants_count
        FROM conferences c
        INNER JOIN conference_participants cp ON c.id = cp.conference_id AND cp.user_id = $1
        LEFT JOIN villages v ON c.village_id = v.village_id
        LEFT JOIN users u ON c.created_by = u.user_id
        WHERE c.village_id = $2
        ORDER BY c.scheduled_date DESC, c.scheduled_time DESC, c.created_at DESC
      `;
      params = [user.user_id, user.village_id];
    }

    const res = await this.pool.query(sql, params);
    return res.rows.map(r => ({
      ...r,
      duration: Number(r.duration),
      participants_count: Number(r.participants_count)
    }));
  }

  public async getConferenceById(conferenceId: string): Promise<Conference | null> {
    const res = await this.pool.query(`
      SELECT c.*, v.village_name, u.name as created_by_name
      FROM conferences c
      LEFT JOIN villages v ON c.village_id = v.village_id
      LEFT JOIN users u ON c.created_by = u.user_id
      WHERE c.id = $1
    `, [conferenceId]);

    if (res.rows.length === 0) return null;
    const conf = res.rows[0];

    const partRes = await this.pool.query(`
      SELECT cp.*, u.name as user_name, u.role
      FROM conference_participants cp
      LEFT JOIN users u ON cp.user_id = u.user_id
      WHERE cp.conference_id = $1
    `, [conferenceId]);

    conf.participants = partRes.rows;
    conf.participants_count = partRes.rows.length;
    conf.duration = Number(conf.duration);
    return conf;
  }

  public async getMembersForVillage(villageId: string): Promise<Array<{ user_id: string; name: string; mobile: string; role: string }>> {
    const res = await this.pool.query(`
      SELECT user_id, name, mobile, role FROM users
      WHERE village_id = $1 AND role = 'MEMBER' AND status = 'ACTIVE'
      ORDER BY name ASC
    `, [villageId]);
    return res.rows;
  }

  public async createConference(
    data: {
      title: string;
      description?: string;
      village_id: string;
      scheduled_date: string;
      scheduled_time: string;
      duration: number;
      participant_user_ids: string[];
    },
    user: User
  ): Promise<Conference> {
    return withTransaction(async (client) => {
      // 1. Strict Village Head verification
      if (user.role !== 'VILLAGE_HEAD') {
        throw new Error('Forbidden: Only Village Heads can create video conferences.');
      }
      if (!user.village_id) {
        throw new Error('Village Head must be assigned to exactly one village.');
      }
      if (data.village_id !== user.village_id) {
        throw new Error('Security Violation: A Village Head can create a conference ONLY for their assigned village.');
      }

      // 2. Validate participants: ALL must belong to Village Head assigned village
      const participantIds = Array.isArray(data.participant_user_ids) ? data.participant_user_ids : [];
      if (participantIds.length > 0) {
        const verifyRes = await client.query(`
          SELECT user_id, village_id, role FROM users
          WHERE user_id = ANY($1)
        `, [participantIds]);

        for (const p of verifyRes.rows) {
          if (p.village_id !== user.village_id) {
            throw new Error(`Security Violation: Member ${p.user_id} belongs to a different village. Never allow inviting members from another village.`);
          }
          if (p.role !== 'MEMBER') {
            throw new Error(`Security Violation: User ${p.user_id} is not a Member.`);
          }
        }
      }

      // 3. Generate unique unpredictable Jitsi room name
      const randomPart = crypto.randomBytes(12).toString('hex');
      const jitsiRoomName = `SindhanurAC58_Conf_${randomPart}`;
      const confId = `CONF_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const now = new Date().toISOString();

      const confRes = await client.query(`
        INSERT INTO conferences (
          id, title, description, village_id, created_by, scheduled_date, scheduled_time,
          duration, jitsi_room_name, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Scheduled', $10)
        RETURNING *
      `, [
        confId,
        data.title,
        data.description || null,
        user.village_id,
        user.user_id,
        data.scheduled_date,
        data.scheduled_time,
        data.duration || 30,
        jitsiRoomName,
        now
      ]);

      // 4. Insert host and invited participants
      // Insert host first
      await client.query(`
        INSERT INTO conference_participants (conference_id, user_id, invited_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (conference_id, user_id) DO NOTHING
      `, [confId, user.user_id, now]);

      // Insert invited members
      for (const pId of participantIds) {
        if (pId === user.user_id) continue;
        await client.query(`
          INSERT INTO conference_participants (conference_id, user_id, invited_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (conference_id, user_id) DO NOTHING
        `, [confId, pId, now]);

        // 5. Notify the selected members
        const notifId = generateSecureId('NTF');
        await client.query(`
          INSERT INTO notifications (notification_id, user_id, village_id, title, message, type, is_read, link_url, created_at)
          VALUES ($1, $2, $3, 'Village meeting scheduled', $4, 'CONFERENCE', false, '/meetings', $5)
        `, [
          notifId,
          pId,
          user.village_id,
          `Village meeting scheduled: '${data.title}' on ${data.scheduled_date} at ${data.scheduled_time} (Village: ${user.village_id}).`,
          now
        ]);
      }

      // 6. Audit Log
      const auditId = generateSecureId('AUD');
      await client.query(`
        INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
        VALUES ($1, $2, $3, $4, 'CREATE', 'CONFERENCE', $5, $6, $7, $8)
      `, [
        auditId,
        user.user_id,
        user.name,
        user.role,
        confId,
        user.village_id,
        `Village Head (${user.name}) scheduled video conference '${data.title}' for village ${user.village_id} with ${participantIds.length} members.`,
        now
      ]);

      const created = confRes.rows[0];
      delete created.jitsi_room_name; // Do not leak in standard response
      return {
        ...created,
        duration: Number(created.duration),
        participants_count: participantIds.length + 1
      };
    });
  }

  public async authorizeConferenceAccess(
    conferenceId: string,
    user: User
  ): Promise<{ jitsi_room_name: string; conference: Conference }> {
    return withTransaction(async (client) => {
      const confRes = await client.query('SELECT * FROM conferences WHERE id = $1 FOR UPDATE', [conferenceId]);
      if (confRes.rows.length === 0) {
        throw new Error('Video conference not found.');
      }
      const conf = confRes.rows[0];

      // 1. Check conference status
      if (conf.status === 'Ended' || conf.ended_at) {
        throw new Error('This conference has ended.');
      }
      if (conf.status === 'Cancelled') {
        throw new Error('This conference has been cancelled.');
      }

      // 2. Authorization & village isolation check
      if (user.role === 'SUPER_ADMIN') {
        // Super Admin can join any conference in the constituency
      } else if (user.role === 'VILLAGE_HEAD') {
        // Village Head can join only conferences belonging to their assigned village
        if (conf.village_id !== user.village_id) {
          throw new Error('You are not authorized to join this conference.');
        }
      } else if (user.role === 'MEMBER') {
        // Member must belong to the conference's village AND be an invited participant
        if (conf.village_id !== user.village_id) {
          throw new Error('You are not authorized to join this conference.');
        }
        const partCheck = await client.query(
          'SELECT * FROM conference_participants WHERE conference_id = $1 AND user_id = $2',
          [conferenceId, user.user_id]
        );
        if (partCheck.rows.length === 0) {
          throw new Error('You are not authorized to join this conference.');
        }
      } else {
        throw new Error('You are not authorized to join this conference.');
      }

      // 3. If conference was 'Scheduled', change status to 'Live' and record started_at
      const now = new Date().toISOString();
      if (conf.status === 'Scheduled') {
        await client.query(
          `UPDATE conferences SET status = 'Live', started_at = COALESCE(started_at, $1) WHERE id = $2`,
          [now, conferenceId]
        );
        conf.status = 'Live';
        conf.started_at = conf.started_at || now;
      }

      // 4. Update participant's joined_at
      await client.query(`
        INSERT INTO conference_participants (conference_id, user_id, invited_at, joined_at)
        VALUES ($1, $2, $3, $3)
        ON CONFLICT (conference_id, user_id) DO UPDATE SET joined_at = EXCLUDED.joined_at
      `, [conferenceId, user.user_id, now]);

      // 5. Audit log
      const auditId = generateSecureId('AUD');
      await client.query(`
        INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
        VALUES ($1, $2, $3, $4, 'STATUS_CHANGE', 'CONFERENCE', $5, $6, $7, $8)
      `, [
        auditId,
        user.user_id,
        user.name,
        user.role,
        conferenceId,
        conf.village_id,
        `${user.name} (${user.role}) joined conference '${conf.title}'.`,
        now
      ]);

      const jitsiRoomName = conf.jitsi_room_name;
      delete conf.jitsi_room_name;

      return {
        jitsi_room_name: jitsiRoomName,
        conference: {
          ...conf,
          duration: Number(conf.duration)
        }
      };
    });
  }

  public async leaveConference(conferenceId: string, user: User): Promise<void> {
    const now = new Date().toISOString();
    await this.pool.query(`
      UPDATE conference_participants SET left_at = $1
      WHERE conference_id = $2 AND user_id = $3
    `, [now, conferenceId, user.user_id]);

    const auditId = generateSecureId('AUD');
    await this.pool.query(`
      INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
      VALUES ($1, $2, $3, $4, 'STATUS_CHANGE', 'CONFERENCE', $5, $6, $7, $8)
    `, [
      auditId,
      user.user_id,
      user.name,
      user.role,
      conferenceId,
      user.village_id || null,
      `${user.name} left video conference ${conferenceId}.`,
      now
    ]);
  }

  public async endConference(conferenceId: string, user: User): Promise<Conference> {
    return withTransaction(async (client) => {
      const confRes = await client.query('SELECT * FROM conferences WHERE id = $1 FOR UPDATE', [conferenceId]);
      if (confRes.rows.length === 0) {
        throw new Error('Conference not found.');
      }
      const conf = confRes.rows[0];

      // Strict role check:
      // Super Admin: CANNOT end a conference
      // Member: CANNOT end conferences
      // Village Head: Can end their own conference for everyone
      if (user.role !== 'VILLAGE_HEAD' || user.village_id !== conf.village_id) {
        throw new Error('Forbidden: Only the Village Head of this village can end this conference for everyone.');
      }

      const now = new Date().toISOString();
      const updateRes = await client.query(`
        UPDATE conferences SET status = 'Ended', ended_at = $1 WHERE id = $2 RETURNING *
      `, [now, conferenceId]);

      const auditId = generateSecureId('AUD');
      await client.query(`
        INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
        VALUES ($1, $2, $3, $4, 'STATUS_CHANGE', 'CONFERENCE', $5, $6, $7, $8)
      `, [
        auditId,
        user.user_id,
        user.name,
        user.role,
        conferenceId,
        conf.village_id,
        `Village Head (${user.name}) ended video conference '${conf.title}' for all participants.`,
        now
      ]);

      const ended = updateRes.rows[0];
      delete ended.jitsi_room_name;
      return {
        ...ended,
        duration: Number(ended.duration)
      };
    });
  }


  public async deleteConference(conferenceId: string, user: User): Promise<void> {
    if (user.role !== 'SUPER_ADMIN') {
      throw new Error('Forbidden: Only Super Admins can delete conference history.');
    }

    await withTransaction(async (client) => {
      const confRes = await client.query(
        'SELECT * FROM conferences WHERE id = $1 FOR UPDATE',
        [conferenceId]
      );

      if (confRes.rows.length === 0) {
        throw new Error('Conference not found.');
      }

      const conf = confRes.rows[0];

      if (conf.status !== 'Ended') {
        throw new Error('Only ended conferences can be deleted from history.');
      }

      const now = new Date().toISOString();
      const auditId = generateSecureId('AUD');

      await client.query(`
        INSERT INTO audit_logs
          (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
        VALUES
          ($1, $2, $3, $4, 'DELETE', 'CONFERENCE', $5, $6, $7, $8)
      `, [
        auditId,
        user.user_id,
        user.name,
        user.role,
        conferenceId,
        conf.village_id,
        `Super Admin (${user.name}) permanently deleted ended video conference '${conf.title}' from history.`,
        now
      ]);

      await client.query(
        'DELETE FROM conferences WHERE id = $1',
        [conferenceId]
      );
    });
  }
  // --- Tasks ---
  public async getTasks(allowedVillageIds?: string[] | null): Promise<Task[]> {
    let sql = 'SELECT * FROM tasks';
    const params: any[] = [];
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      sql += ' WHERE village_id = ANY($1)';
      params.push(allowedVillageIds);
    }
    sql += ' ORDER BY created_at DESC';
    const res = await this.pool.query(sql, params);
    return res.rows;
  }

  public async createTask(task: Task, user: User): Promise<Task> {
    return withTransaction(async (client) => {
      const now = new Date().toISOString();
      const res = await client.query(
        `INSERT INTO tasks (
           task_id, village_id, gp_id, title, description, assigned_to, assigned_to_name,
           linked_type, linked_id, priority, due_date, status, created_by, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14) RETURNING *`,
        [
          task.task_id,
          task.village_id,
          task.gp_id || null,
          task.title,
          task.description,
          task.assigned_to || null,
          task.assigned_to_name || null,
          task.linked_type || null,
          task.linked_id || null,
          task.priority,
          task.due_date,
          task.status || 'PENDING',
          task.created_by,
          now
        ]
      );

      if (task.assigned_to) {
        const notifId = generateSecureId('NTF');
        await client.query(
          `INSERT INTO notifications (notification_id, user_id, village_id, title, message, type, is_read, link_url, created_at)
           VALUES ($1, $2, $3, 'New Task Assigned', $4, 'TASK', false, '/tasks', $5)`,
          [notifId, task.assigned_to, task.village_id, `You have been assigned task: ${task.title}`, now]
        );
      }

      const auditId = generateSecureId('AUD');
      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'CREATE', 'TASK', $5, $6, $7, $8)`,
        [auditId, user.user_id, user.name, user.role, task.task_id, task.village_id, `Created task: ${task.title}`, now]
      );

      return res.rows[0];
    });
  }

  public async updateTaskStatus(taskId: string, status: TaskStatus, user: User): Promise<Task | null> {
    const now = new Date().toISOString();
    const completedAt = status === 'COMPLETED' ? now : null;
    const res = await this.pool.query(
      `UPDATE tasks SET status = $1, completed_at = $2, updated_at = $3 WHERE task_id = $4 RETURNING *`,
      [status, completedAt, now, taskId]
    );
    if (res.rows.length === 0) return null;
    const task = res.rows[0];

    await this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'STATUS_CHANGE',
      record_type: 'TASK',
      record_id: taskId,
      village_id: task.village_id,
      details: `Updated task ${task.title} to ${status}`
    });

    return res.rows[0];
  }

  // --- Documents ---
  public async getDocuments(allowedVillageIds?: string[] | null): Promise<VillageDocument[]> {
    let sql = 'SELECT * FROM documents';
    const params: any[] = [];
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      sql += ' WHERE village_id = ANY($1)';
      params.push(allowedVillageIds);
    }
    sql += ' ORDER BY created_at DESC';
    const res = await this.pool.query(sql, params);
    return res.rows;
  }

  public async createDocument(doc: VillageDocument, user: User): Promise<VillageDocument> {
    const now = new Date().toISOString();
    const res = await this.pool.query(
      `INSERT INTO documents (file_id, village_id, uploaded_by, uploaded_by_name, file_name, file_type, file_size, file_url, category, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        doc.file_id,
        doc.village_id,
        doc.uploaded_by,
        doc.uploaded_by_name,
        doc.file_name,
        doc.file_type,
        doc.file_size || 0,
        doc.file_url,
        doc.category,
        now
      ]
    );

    await this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'FILE_UPLOAD',
      record_type: 'DOCUMENT',
      record_id: doc.file_id,
      village_id: doc.village_id,
      details: `Uploaded document: ${doc.file_name}`
    });

    return res.rows[0];
  }

  // --- Announcements ---
  public async getAnnouncements(allowedVillageIds?: string[] | null): Promise<Announcement[]> {
    let sql = 'SELECT * FROM announcements';
    const params: any[] = [];
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      sql += ' WHERE village_id = ANY($1) OR village_id IS NULL';
      params.push(allowedVillageIds);
    }
    sql += ' ORDER BY created_at DESC';
    const res = await this.pool.query(sql, params);
    return res.rows;
  }

  public async createAnnouncement(announcement: Announcement, user: User): Promise<Announcement> {
    const now = new Date().toISOString();
    const res = await this.pool.query(
      `INSERT INTO announcements (announcement_id, village_id, title, content, priority, created_by, created_by_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        announcement.announcement_id,
        announcement.village_id || null,
        announcement.title,
        announcement.content,
        announcement.priority || 'NORMAL',
        announcement.created_by,
        announcement.created_by_name,
        now
      ]
    );

    await this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'ANNOUNCEMENT',
      record_id: announcement.announcement_id,
      village_id: announcement.village_id || undefined,
      details: `Published announcement: ${announcement.title}`
    });

    return res.rows[0];
  }

  // --- Notifications ---
  public async getNotifications(user: User): Promise<Notification[]> {
    const res = await this.pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 50',
      [user.user_id]
    );
    return res.rows;
  }

  public async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const res = await this.pool.query(
      'UPDATE notifications SET is_read = true WHERE notification_id = $1',
      [notificationId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  public async createUser(userData: ServerUser, adminUser: User): Promise<ServerUser> {
    const now = new Date().toISOString();
    const res = await this.pool.query(
      `INSERT INTO users (
         user_id, name, name_kannada, mobile, email, voter_id, role, status,
         village_id, gp_id, taluk_id, constituency_id, password_hash, password_salt,
         dob, gender, address, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
      [
        userData.user_id, userData.name, userData.name_kannada || null, userData.mobile,
        userData.email || null, userData.voter_id, userData.role, userData.status || 'ACTIVE',
        userData.village_id || null, userData.gp_id || null, userData.taluk_id || 'TLK_SND',
        userData.constituency_id || 'AC58', userData.password_hash || null, userData.password_salt || null,
        userData.dob || null, userData.gender || null, userData.address || null, now, now
      ]
    );

    await this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'CREATE',
      record_type: 'USER',
      record_id: userData.user_id,
      village_id: userData.village_id || undefined,
      details: `Created team member ${userData.name} with role ${userData.role}`
    });

    return res.rows[0];
  }

  public async updateUser(userId: string, updates: Partial<ServerUser>, adminUser: User): Promise<ServerUser | null> {
    const existing = await this.findUserById(userId);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    const now = new Date().toISOString();

    const res = await this.pool.query(
      `UPDATE users SET
         name = $1, name_kannada = $2, mobile = $3, email = $4, voter_id = $5,
         role = $6, status = $7, village_id = $8, gp_id = $9, dob = $10, gender = $11,
         address = $12, updated_at = $13
       WHERE user_id = $14 RETURNING *`,
      [
        merged.name, merged.name_kannada || null, merged.mobile, merged.email || null,
        merged.voter_id, merged.role, merged.status, merged.village_id || null,
        merged.gp_id || null, merged.dob || null, merged.gender || null,
        merged.address || null, now, userId
      ]
    );

    await this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'UPDATE',
      record_type: 'USER',
      record_id: userId,
      village_id: merged.village_id || undefined,
      details: `Updated details for user ${merged.name}`
    });

    return res.rows[0];
  }

  public async createNotification(notif: Notification): Promise<Notification> {
    const notifId = notif.notification_id || generateSecureId('NTF');
    const now = notif.created_at || new Date().toISOString();
    await this.pool.query(
      `INSERT INTO notifications (notification_id, user_id, village_id, title, message, type, is_read, link_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (notification_id) DO NOTHING`,
      [notifId, notif.user_id || null, notif.village_id || null, notif.title, notif.message, notif.type, notif.is_read || false, notif.link_url || null, now]
    );
    return { ...notif, notification_id: notifId, created_at: now };
  }

  public async markNotificationRead(notificationId: string): Promise<boolean> {
    return this.markNotificationAsRead(notificationId);
  }

  public async updateIssue(issueId: string, updates: Partial<Issue>, user: User): Promise<Issue | null> {
    return withTransaction(async (client) => {
      const iRes = await client.query('SELECT * FROM issues WHERE issue_id = $1 FOR UPDATE', [issueId]);
      if (iRes.rows.length === 0) return null;
      const oldIssue = iRes.rows[0];
      const now = new Date().toISOString();

      const merged = { ...oldIssue, ...updates };
      const resolvedAt = updates.status === 'RESOLVED' ? now : (updates.status ? null : oldIssue.resolved_at);

      const res = await client.query(
        `UPDATE issues SET
           title = $1, description = $2, category = $3, priority = $4, status = $5,
           assigned_to = $6, assigned_to_name = $7, updated_at = $8, resolved_at = $9
         WHERE issue_id = $10 RETURNING *`,
        [merged.title, merged.description, merged.category, merged.priority, merged.status, merged.assigned_to || null, merged.assigned_to_name || null, now, resolvedAt, issueId]
      );

      if (updates.status && updates.status !== oldIssue.status) {
        const updateId = generateSecureId('UPD');
        await client.query(
          `INSERT INTO issue_updates (update_id, issue_id, village_id, user_id, user_name, previous_status, new_status, remarks, timestamp, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
          [updateId, issueId, oldIssue.village_id, user.user_id, user.name, oldIssue.status, updates.status, `Status updated to ${updates.status}`, now]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'UPDATE', 'ISSUE', $5, $6, $7, $8)`,
        [generateSecureId('AUD'), user.user_id, user.name, user.role, issueId, oldIssue.village_id, `Updated issue ${merged.title}`, now]
      );

      return res.rows[0];
    });
  }

  public async updateProject(projectId: string, updates: Partial<DevelopmentProject>, user: User): Promise<DevelopmentProject | null> {
    return withTransaction(async (client) => {
      const pRes = await client.query('SELECT * FROM development_projects WHERE project_id = $1 FOR UPDATE', [projectId]);
      if (pRes.rows.length === 0) return null;
      const old = pRes.rows[0];
      const merged = { ...old, ...updates };
      const now = new Date().toISOString();

      const res = await client.query(
        `UPDATE development_projects SET
           project_name = $1, project_name_kannada = $2, department = $3, description = $4,
           estimated_cost = $5, approved_cost = $6, status = $7, progress_percentage = $8,
           contractor_name = $9, updated_at = $10
         WHERE project_id = $11 RETURNING *`,
        [
          merged.project_name,
          merged.project_name_kannada || null,
          merged.department,
          merged.description,
          merged.estimated_cost,
          merged.approved_cost,
          merged.status,
          merged.progress_percentage,
          merged.contractor_name,
          now,
          projectId
        ]
      );

      await client.query(
        `INSERT INTO audit_logs (audit_id, user_id, user_name, role, action, record_type, record_id, village_id, details, timestamp)
         VALUES ($1, $2, $3, $4, 'UPDATE', 'PROJECT', $5, $6, $7, $8)`,
        [generateSecureId('AUD'), user.user_id, user.name, user.role, projectId, old.village_id, `Updated project ${merged.project_name}. Progress: ${merged.progress_percentage}%`, now]
      );

      return res.rows[0];
    });
  }

  public async updateTask(taskId: string, updates: Partial<Task>, user: User): Promise<Task | null> {
    const existingRes = await this.pool.query('SELECT * FROM tasks WHERE task_id = $1', [taskId]);
    if (existingRes.rows.length === 0) return null;
    const existing = existingRes.rows[0];
    const merged = { ...existing, ...updates };
    const now = new Date().toISOString();

    const res = await this.pool.query(
      `UPDATE tasks SET
         title = $1, description = $2, priority = $3, status = $4,
         due_date = $5, assigned_to = $6, assigned_to_name = $7, updated_at = $8
       WHERE task_id = $9 RETURNING *`,
      [merged.title, merged.description, merged.priority, merged.status, merged.due_date, merged.assigned_to, merged.assigned_to_name, now, taskId]
    );

    await this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'UPDATE',
      record_type: 'TASK',
      record_id: taskId,
      village_id: existing.village_id,
      details: `Updated task ${merged.title}`
    });

    return res.rows[0];
  }

  public async endVideoMeeting(meetingId: string, user: User): Promise<VideoMeeting | null> {
    return this.updateVideoMeeting(meetingId, { status: 'ENDED', ended_at: new Date().toISOString() } as any, user);
  }

  public async resetToSeed(): Promise<any> {
    await initializeSchema();
    return migrateDataToPostgres();
  }
}

/**
 * Persistent Unified Repository.
 * Handles production PostgreSQL queries with strict persistence, connection pooling, and SSL.
 * When in development/preview without DATABASE_URL, gracefully provides non-blocking access without prompt.
 */
export class PersistentRepository {
  public pg = new PostgresRepository();

  private get isPostgres(): boolean {
    return getPostgresPool() !== null;
  }

  private checkEnvironment(): void {
    if (!this.isPostgres && isProduction) {
      throw new Error('Database connection unavailable. Please try again later.');
    }
  }

  // --- Audit Logs ---
  public async logAudit(entry: Omit<AuditLog, 'audit_id' | 'timestamp'>): Promise<AuditLog> {
    if (this.isPostgres) return this.pg.logAudit(entry);
    this.checkEnvironment();
    return db.logAudit(entry);
  }

  public async getAuditLogs(allowedVillageIds?: string[] | null): Promise<AuditLog[]> {
    if (this.isPostgres) return this.pg.getAuditLogs(allowedVillageIds);
    this.checkEnvironment();
    return db.getAuditLogs(allowedVillageIds);
  }

  // --- Users ---
  public async findUserById(userId: string): Promise<ServerUser | undefined> {
    if (this.isPostgres) return this.pg.findUserById(userId);
    this.checkEnvironment();
    return db.findUserById(userId);
  }

  public async findUserByMobile(mobile: string): Promise<ServerUser | undefined> {
    if (this.isPostgres) return this.pg.findUserByMobile(mobile);
    this.checkEnvironment();
    return db.findUserByMobile(mobile);
  }

  public async findUserByVoterId(voterId: string): Promise<ServerUser | undefined> {
    if (this.isPostgres) return this.pg.findUserByVoterId(voterId);
    this.checkEnvironment();
    return db.findUserByVoterId(voterId);
  }

  public async findUserByEmail(email: string): Promise<ServerUser | undefined> {
    if (this.isPostgres) return this.pg.findUserByEmail(email);
    this.checkEnvironment();
    return db.findUserByEmail(email);
  }

  public async getAllUsers(): Promise<ServerUser[]> {
    if (this.isPostgres) return this.pg.getAllUsers();
    this.checkEnvironment();
    return db.getAllUsers();
  }

  public async isSuperAdminInitialized(): Promise<boolean> {
    if (this.isPostgres) return this.pg.isSuperAdminInitialized();
    this.checkEnvironment();
    return db.isSuperAdminInitialized();
  }

  public async setupSuperAdmin(params: { name: string; mobile: string; email?: string; password?: string }): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    if (this.isPostgres) return this.pg.setupSuperAdmin(params);
    this.checkEnvironment();
    return db.setupSuperAdmin({ ...params, password: params.password || 'SindhanurAC58@2025' });
  }

  public async registerUser(params: { name: string; name_kannada?: string; mobile: string; email?: string; voter_id: string; dob?: string; gender?: string; address?: string; village_id: string; password?: string; profile_photo?: string }): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    if (this.isPostgres) return this.pg.registerUser(params);
    this.checkEnvironment();
    return db.registerUser({
      name: params.name,
      mobile: params.mobile,
      voter_id: params.voter_id,
      dob: params.dob,
      gender: params.gender,
      address: params.address,
      village_id: params.village_id,
      password: params.password || 'Password@123'
    });
  }

  public async approveMember(userId: string, adminUser: User): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    if (this.isPostgres) return this.pg.approveMember(userId, adminUser);
    this.checkEnvironment();
    return db.approveMember(userId, adminUser);
  }

  public async rejectMember(userId: string, adminUser: User): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    if (this.isPostgres) return this.pg.rejectMember(userId, adminUser);
    this.checkEnvironment();
    return db.rejectMember(userId, adminUser);
  }

  public async promoteToVillageHead(userId: string, targetVillageId: string, adminUser: User): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    if (this.isPostgres) return this.pg.promoteToVillageHead(userId, targetVillageId, adminUser);
    this.checkEnvironment();
    return db.promoteToVillageHead(userId, targetVillageId, adminUser);
  }

  public async demoteToMember(userId: string, adminUser: User): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    if (this.isPostgres) return this.pg.demoteToMember(userId, adminUser);
    this.checkEnvironment();
    return db.demoteToMember(userId, adminUser);
  }

  public async reassignVillageHead(userId: string, newVillageId: string, adminUser: User): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    if (this.isPostgres) return this.pg.reassignVillageHead(userId, newVillageId, adminUser);
    this.checkEnvironment();
    return db.reassignVillageHead(userId, newVillageId, adminUser);
  }

  public async deleteUser(userId: string, adminUser: User): Promise<{ success: boolean; error?: string }> {
    if (this.isPostgres) return this.pg.deleteUser(userId, adminUser);
    this.checkEnvironment();
    return db.deleteUser(userId, adminUser);
  }

  public async updateUserByAdmin(
    userId: string,
    updates: {
      name?: string;
      name_kannada?: string;
      mobile?: string;
      voter_id?: string;
      role?: any;
      village_id?: string | null;
      status?: any;
      email?: string;
      address?: string;
    },
    adminUser: User
  ): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    if (this.isPostgres) return this.pg.updateUserByAdmin(userId, updates, adminUser);
    this.checkEnvironment();
    return db.updateUserByAdmin(userId, updates, adminUser);
  }

  public async resetPassword(params: { mobile: string; voter_id: string; new_password: string }): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    if (this.isPostgres) return this.pg.resetPassword(params);
    this.checkEnvironment();
    return db.resetPassword(params);
  }

  public async setUserStatus(userId: string, status: UserStatus, adminUser: User): Promise<{ success: boolean; user?: ServerUser; error?: string }> {
    if (this.isPostgres) return this.pg.setUserStatus(userId, status, adminUser);
    this.checkEnvironment();
    return db.setUserStatus(userId, status, adminUser);
  }

  public async getUsersByFilter(filter: { role?: string; status?: string; village_id?: string; gp_id?: string; allowedVillageIds?: string[] | null; search?: string }): Promise<ServerUser[]> {
    if (this.isPostgres) return this.pg.getUsersByFilter(filter);
    this.checkEnvironment();
    return db.getUsersByFilter(filter);
  }

  public async createUser(userData: ServerUser, adminUser: User): Promise<ServerUser> {
    if (this.isPostgres) return this.pg.createUser(userData, adminUser);
    this.checkEnvironment();
    return db.createUser(userData, adminUser);
  }

  public async updateUser(userId: string, updates: Partial<ServerUser>, adminUser: User): Promise<ServerUser | null> {
    if (this.isPostgres) return this.pg.updateUser(userId, updates, adminUser);
    this.checkEnvironment();
    return db.updateUser(userId, updates, adminUser);
  }

  // --- Administrative Boundaries ---
  public async getConstituency(): Promise<Constituency> {
    if (this.isPostgres) return this.pg.getConstituency();
    this.checkEnvironment();
    return db.getConstituency();
  }

  public async getTaluks(): Promise<Taluk[]> {
    if (this.isPostgres) return this.pg.getTaluks();
    this.checkEnvironment();
    return db.getTaluks();
  }

  public async getGramPanchayats(filterGpId?: string | null): Promise<GramPanchayat[]> {
    if (this.isPostgres) return this.pg.getGramPanchayats(filterGpId);
    this.checkEnvironment();
    return db.getGramPanchayats();
  }

  public async getGramPanchayatById(gpId: string): Promise<GramPanchayat | undefined> {
    if (this.isPostgres) return this.pg.getGramPanchayatById(gpId);
    this.checkEnvironment();
    return db.getGramPanchayatById(gpId);
  }

  public async getVillages(allowedVillageIds?: string[] | null): Promise<Village[]> {
    if (this.isPostgres) return this.pg.getVillages(allowedVillageIds);
    this.checkEnvironment();
    return db.getVillages(allowedVillageIds);
  }

  public async getVillageById(villageId: string): Promise<Village | undefined> {
    if (this.isPostgres) return this.pg.getVillageById(villageId);
    this.checkEnvironment();
    return db.getVillageById(villageId);
  }

  public async createVillage(village: Village, adminUser: User): Promise<Village> {
    if (this.isPostgres) return this.pg.createVillage(village, adminUser);
    this.checkEnvironment();
    return db.createVillage(village, adminUser);
  }

  public async updateVillage(villageId: string, updates: Partial<Village>, adminUser: User): Promise<Village | null> {
    if (this.isPostgres) return this.pg.updateVillage(villageId, updates, adminUser);
    this.checkEnvironment();
    return db.updateVillage(villageId, updates, adminUser);
  }

  public async getBooths(villageId?: string | null): Promise<Booth[]> {
    if (this.isPostgres) return this.pg.getBooths(villageId);
    this.checkEnvironment();
    return db.getBooths(villageId);
  }

  public async getBoothById(boothId: string): Promise<Booth | undefined> {
    if (this.isPostgres) return this.pg.getBoothById(boothId);
    this.checkEnvironment();
    return db.getBoothById(boothId);
  }

  public async createBooth(booth: Booth, adminUser: User): Promise<Booth> {
    if (this.isPostgres) return this.pg.createBooth(booth, adminUser);
    this.checkEnvironment();
    return db.createBooth(booth, adminUser);
  }

  // --- Issues ---
  public async getIssues(allowedVillageIds?: string[] | null): Promise<Issue[]> {
    if (this.isPostgres) return this.pg.getIssues(allowedVillageIds);
    this.checkEnvironment();
    return db.getIssues(allowedVillageIds);
  }

  public async getIssueById(issueId: string): Promise<Issue | undefined> {
    if (this.isPostgres) return this.pg.getIssueById(issueId);
    this.checkEnvironment();
    return db.getIssueById(issueId);
  }

  public async getIssueUpdates(issueId: string): Promise<IssueUpdate[]> {
    if (this.isPostgres) return this.pg.getIssueUpdates(issueId);
    this.checkEnvironment();
    return db.getSchema().issue_updates.filter(u => u.issue_id === issueId);
  }

  public async createIssue(issue: Issue, user: User): Promise<Issue> {
    if (this.isPostgres) return this.pg.createIssue(issue, user);
    this.checkEnvironment();
    return db.createIssue(issue, user);
  }

  public async updateIssue(issueId: string, updates: Partial<Issue>, user: User): Promise<Issue | null> {
    if (this.isPostgres) return this.pg.updateIssue(issueId, updates, user);
    this.checkEnvironment();
    return db.updateIssue(issueId, updates, user);
  }

  public async updateIssueStatus(issueId: string, status: any, remarks: string, user: User, assignedTo?: string, assignedToName?: string): Promise<Issue | null> {
    if (this.isPostgres) return this.pg.updateIssueStatus(issueId, status, remarks, user, assignedTo, assignedToName);
    this.checkEnvironment();
    return db.updateIssueStatus(issueId, status, remarks, user);
  }

  public async deleteIssue(issueId: string, user: User): Promise<boolean> {
    if (this.isPostgres) return this.pg.deleteIssue(issueId, user);
    this.checkEnvironment();
    return db.deleteIssue(issueId, user);
  }

  // --- Projects ---
  public async getProjects(allowedVillageIds?: string[] | null): Promise<DevelopmentProject[]> {
    if (this.isPostgres) return this.pg.getProjects(allowedVillageIds);
    this.checkEnvironment();
    return db.getProjects(allowedVillageIds);
  }

  public async getProjectById(projectId: string): Promise<DevelopmentProject | undefined> {
    if (this.isPostgres) return this.pg.getProjectById(projectId);
    this.checkEnvironment();
    return db.getProjectById(projectId);
  }

  public async getProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
    if (this.isPostgres) return this.pg.getProjectUpdates(projectId);
    this.checkEnvironment();
    return db.getSchema().project_updates.filter(u => u.project_id === projectId);
  }

  public async createProject(project: DevelopmentProject, user: User): Promise<DevelopmentProject> {
    if (this.isPostgres) return this.pg.createProject(project, user);
    this.checkEnvironment();
    return db.createProject(project, user);
  }

  public async updateProject(projectId: string, updates: Partial<DevelopmentProject>, user: User): Promise<DevelopmentProject | null> {
    if (this.isPostgres) return this.pg.updateProject(projectId, updates, user);
    this.checkEnvironment();
    return db.updateProject(projectId, updates, user);
  }

  public async updateProjectProgress(projectId: string, progress: number, remarks: string, user: User): Promise<DevelopmentProject | null> {
    if (this.isPostgres) return this.pg.updateProjectProgress(projectId, progress, remarks, user);
    this.checkEnvironment();
    return db.updateProjectProgress(projectId, progress, remarks, user);
  }

  // --- Field Visits ---
  public async getFieldVisits(allowedVillageIds?: string[] | null): Promise<FieldVisit[]> {
    if (this.isPostgres) return this.pg.getFieldVisits(allowedVillageIds);
    this.checkEnvironment();
    return db.getFieldVisits(allowedVillageIds);
  }

  public async createFieldVisit(visit: FieldVisit, user: User): Promise<FieldVisit> {
    if (this.isPostgres) return this.pg.createFieldVisit(visit, user);
    this.checkEnvironment();
    return db.createFieldVisit(visit, user);
  }

  // --- Meetings ---
  public async getMeetings(allowedVillageIds?: string[] | null): Promise<VillageMeeting[]> {
    if (this.isPostgres) return this.pg.getMeetings(allowedVillageIds);
    this.checkEnvironment();
    return db.getMeetings(allowedVillageIds);
  }

  public async createMeeting(meeting: VillageMeeting, user: User): Promise<VillageMeeting> {
    if (this.isPostgres) return this.pg.createMeeting(meeting, user);
    this.checkEnvironment();
    return db.createMeeting(meeting, user);
  }

  // --- Video Meetings ---
  public async getVideoMeetings(allowedVillageIds?: string[] | null): Promise<VideoMeeting[]> {
    if (this.isPostgres) return this.pg.getVideoMeetings(allowedVillageIds);
    this.checkEnvironment();
    return db.getVideoMeetings(allowedVillageIds);
  }

  public async getVideoMeetingById(meetingId: string): Promise<VideoMeeting | undefined> {
    if (this.isPostgres) return this.pg.getVideoMeetingById(meetingId);
    this.checkEnvironment();
    return db.getVideoMeetingById(meetingId);
  }

  public async createVideoMeeting(meeting: VideoMeeting, user: User): Promise<VideoMeeting> {
    if (this.isPostgres) return this.pg.createVideoMeeting(meeting, user);
    this.checkEnvironment();
    return db.createVideoMeeting(meeting, user);
  }

  public async updateVideoMeeting(meetingId: string, updates: Partial<VideoMeeting>, user: User): Promise<VideoMeeting | null> {
    if (this.isPostgres) return this.pg.updateVideoMeeting(meetingId, updates, user);
    this.checkEnvironment();
    return db.updateVideoMeeting(meetingId, updates, user);
  }

  public async endVideoMeeting(meetingId: string, user: User): Promise<VideoMeeting | null> {
    if (this.isPostgres) return this.pg.endVideoMeeting(meetingId, user);
    this.checkEnvironment();
    return db.endVideoMeeting(meetingId, user);
  }

  public async joinVideoMeeting(meetingId: string, participant: VideoParticipant): Promise<VideoMeeting | null> {
    if (this.isPostgres) return this.pg.joinVideoMeeting(meetingId, participant);
    this.checkEnvironment();
    return db.joinVideoMeeting(meetingId, participant);
  }

  public async leaveVideoMeeting(meetingId: string, userId: string): Promise<VideoMeeting | null> {
    if (this.isPostgres) return this.pg.leaveVideoMeeting(meetingId, userId);
    this.checkEnvironment();
    return db.leaveVideoMeeting(meetingId, userId);
  }

  public async updateParticipantState(meetingId: string, userId: string, updates: Partial<VideoParticipant>): Promise<VideoMeeting | null> {
    if (this.isPostgres) return this.pg.updateParticipantState(meetingId, userId, updates);
    this.checkEnvironment();
    return db.updateParticipantState(meetingId, userId, updates);
  }

  // --- Jitsi Video Conferences (Conferences & Participants) ---
  public async getConferences(user: User): Promise<Conference[]> {
    if (this.isPostgres) return this.pg.getConferences(user);
    this.checkEnvironment();
    return db.getConferences(user);
  }

  public async getConferenceById(conferenceId: string): Promise<Conference | null> {
    if (this.isPostgres) return this.pg.getConferenceById(conferenceId);
    this.checkEnvironment();
    return db.getConferenceById(conferenceId);
  }

  public async getMembersForVillage(villageId: string): Promise<Array<{ user_id: string; name: string; mobile: string; role: string }>> {
    if (this.isPostgres) return this.pg.getMembersForVillage(villageId);
    this.checkEnvironment();
    return db.getMembersForVillage(villageId);
  }

  public async createConference(
    data: {
      title: string;
      description?: string;
      village_id: string;
      scheduled_date: string;
      scheduled_time: string;
      duration: number;
      participant_user_ids: string[];
    },
    user: User
  ): Promise<Conference> {
    if (this.isPostgres) return this.pg.createConference(data, user);
    this.checkEnvironment();
    return db.createConference(data, user);
  }

  public async authorizeConferenceAccess(
    conferenceId: string,
    user: User
  ): Promise<{ jitsi_room_name: string; conference: Conference }> {
    if (this.isPostgres) return this.pg.authorizeConferenceAccess(conferenceId, user);
    this.checkEnvironment();
    return db.authorizeConferenceAccess(conferenceId, user);
  }

  public async leaveConference(conferenceId: string, user: User): Promise<void> {
    if (this.isPostgres) return this.pg.leaveConference(conferenceId, user);
    this.checkEnvironment();
    return db.leaveConference(conferenceId, user);
  }

  public async endConference(conferenceId: string, user: User): Promise<Conference> {
    if (this.isPostgres) return this.pg.endConference(conferenceId, user);
    this.checkEnvironment();
    return db.endConference(conferenceId, user);
  }


  public async deleteConference(conferenceId: string, user: User): Promise<void> {
    if (this.isPostgres) return this.pg.deleteConference(conferenceId, user);
    this.checkEnvironment();
    return db.deleteConference(conferenceId, user);
  }
  // --- Tasks ---
  public async getTasks(allowedVillageIds?: string[] | null): Promise<Task[]> {
    if (this.isPostgres) return this.pg.getTasks(allowedVillageIds);
    this.checkEnvironment();
    return db.getTasks(allowedVillageIds);
  }

  public async createTask(task: Task, user: User): Promise<Task> {
    if (this.isPostgres) return this.pg.createTask(task, user);
    this.checkEnvironment();
    return db.createTask(task, user);
  }

  public async updateTask(taskId: string, updates: Partial<Task>, user: User): Promise<Task | null> {
    if (this.isPostgres) return this.pg.updateTask(taskId, updates, user);
    this.checkEnvironment();
    return db.updateTask(taskId, updates, user);
  }

  public async updateTaskStatus(taskId: string, status: TaskStatus, user: User): Promise<Task | null> {
    if (this.isPostgres) return this.pg.updateTaskStatus(taskId, status, user);
    this.checkEnvironment();
    return db.updateTaskStatus(taskId, status, user);
  }

  // --- Documents ---
  public async getDocuments(allowedVillageIds?: string[] | null): Promise<VillageDocument[]> {
    if (this.isPostgres) return this.pg.getDocuments(allowedVillageIds);
    this.checkEnvironment();
    return db.getDocuments(allowedVillageIds);
  }

  public async createDocument(doc: VillageDocument, user: User): Promise<VillageDocument> {
    if (this.isPostgres) return this.pg.createDocument(doc, user);
    this.checkEnvironment();
    return db.createDocument(doc, user);
  }

  // --- Announcements ---
  public async getAnnouncements(allowedVillageIds?: string[] | null): Promise<Announcement[]> {
    if (this.isPostgres) return this.pg.getAnnouncements(allowedVillageIds);
    this.checkEnvironment();
    return db.getAnnouncements(allowedVillageIds);
  }

  public async createAnnouncement(announcement: Announcement, user: User): Promise<Announcement> {
    if (this.isPostgres) return this.pg.createAnnouncement(announcement, user);
    this.checkEnvironment();
    return db.createAnnouncement(announcement, user);
  }

  // --- Notifications ---
  public async getNotifications(user: User): Promise<Notification[]> {
    if (this.isPostgres) return this.pg.getNotifications(user);
    this.checkEnvironment();
    return db.getNotifications(user);
  }

  public async createNotification(notif: Notification): Promise<Notification> {
    if (this.isPostgres) return this.pg.createNotification(notif);
    this.checkEnvironment();
    return db.createNotification(notif);
  }

  public async markNotificationRead(notificationId: string): Promise<boolean> {
    if (this.isPostgres) return this.pg.markNotificationRead(notificationId);
    this.checkEnvironment();
    return db.markNotificationAsRead(notificationId);
  }

  public async markNotificationAsRead(notificationId: string): Promise<boolean> {
    return this.markNotificationRead(notificationId);
  }

  // --- Reset / Seed ---
  public async resetToSeed(): Promise<any> {
    if (this.isPostgres) return this.pg.resetToSeed();
    this.checkEnvironment();
    return db.resetToSeed();
  }
}

export const repository = new PersistentRepository();
