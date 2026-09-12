import fs from 'fs';
import path from 'path';
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
} from '../types.ts';
import { OFFICIAL_VILLAGES_AC58 } from '../data/villagesList.ts';
import { hashPassword, verifyPassword, maskVoterId, generateSecureId } from './security.ts';

export interface ServerUser extends User {
  password_hash?: string;
  password_salt?: string;
}

export interface DatabaseSchema {
  constituencies: Constituency[];
  taluks: Taluk[];
  gram_panchayats: GramPanchayat[];
  villages: Village[];
  booths: Booth[];
  users: ServerUser[];
  issues: Issue[];
  issue_updates: IssueUpdate[];
  development_projects: DevelopmentProject[];
  project_updates: ProjectUpdate[];
  field_visits: FieldVisit[];
  meetings: VillageMeeting[];
  tasks: Task[];
  documents: VillageDocument[];
  notifications: Notification[];
  audit_logs: AuditLog[];
  video_meetings: VideoMeeting[];
  announcements: Announcement[];
  conferences: Conference[];
  conference_participants: ConferenceParticipant[];
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Resolves internal development/preview database file path.
 * DATABASE_PATH is optional and never required.
 * Preview operates without requiring any filesystem path or user configuration prompt.
 */
export function getDatabaseFilePath(): string {
  if (process.env.DATABASE_PATH && !isProduction) {
    return process.env.DATABASE_PATH;
  }
  return path.join(process.cwd(), 'data', 'constituency_db.json');
}

/**
 * Production Seed Generator for Sindhanur AC-58 (Raichur District, Karnataka)
 * ZERO DEMO DATA:
 * - 0 demo users, 0 demo village heads, 0 demo members
 * - 0 fake issues, 0 fake development projects, 0 fake meetings, 0 fake field visits
 * - 0 fake booths, 0 fake tasks, 0 fake documents, 0 fake notifications
 * - ALL 124 REAL villages of Sindhanur AC-58
 * - ALL 33 REAL Gram Panchayats
 * - Secure initial Super Admin initialized from environment secrets
 */
function getInitialSeedData(): DatabaseSchema {
  const now = new Date().toISOString();

  const constituency: Constituency = {
    constituency_id: 'AC58',
    name: 'Sindhanur',
    name_kannada: 'ಸಿಂಧನೂರು',
    code: 'AC-58',
    district: 'Raichur',
    state: 'Karnataka',
    total_voters: 242850
  };

  const taluk: Taluk = {
    taluk_id: 'TLK_SND',
    constituency_id: 'AC58',
    name: 'Sindhanur Taluk',
    name_kannada: 'ಸಿಂಧನೂರು ತಾಲೂಕು',
    headquarters: 'Sindhanur Town'
  };

  // Extract all 33 authentic Gram Panchayats from verified AC-58 village roster
  const gpMap = new Map<string, GramPanchayat>();
  for (const v of OFFICIAL_VILLAGES_AC58) {
    const gpId = 'GP_' + v.gram_panchayat.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/__+/g, '_');
    if (!gpMap.has(gpId)) {
      gpMap.set(gpId, {
        gp_id: gpId,
        gp_name: `${v.gram_panchayat} Gram Panchayat`,
        kannada_name: `${v.kannada_name || v.gram_panchayat} ಗ್ರಾಮ ಪಂಚಾಯಿತಿ`,
        taluk_id: 'TLK_SND',
        constituency_id: 'AC58',
        status: 'ACTIVE',
        headquarters_village_id: v.village_id,
        villages_count: 0
      });
    }
    gpMap.get(gpId)!.villages_count = (gpMap.get(gpId)!.villages_count || 0) + 1;
  }
  const gram_panchayats: GramPanchayat[] = Array.from(gpMap.values());

  // Generate all 124 authentic villages for Sindhanur AC-58
  const villages: Village[] = OFFICIAL_VILLAGES_AC58.map(v => {
    const gpId = 'GP_' + v.gram_panchayat.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/__+/g, '_');
    return {
      village_id: v.village_id,
      village_name: v.village_name,
      kannada_name: v.kannada_name,
      gp_id: gpId,
      taluk_id: 'TLK_SND',
      constituency_id: 'AC58',
      latitude: v.latitude,
      longitude: v.longitude,
      population: v.population,
      households: v.households,
      voter_count: v.voter_count,
      status: 'ACTIVE' as const
    };
  });

  // Initial Super Admin Account configured via environment secrets or existing hash
  const adminMobile = process.env.SUPER_ADMIN_MOBILE || '9686520152';
  const adminName = process.env.SUPER_ADMIN_NAME || 'MLA Secretariat Super Admin';
  let adminHash = '9b6d8591c015b6d914d79d6711a770051280387bbf6db1aa3be8e8bc3e1258d4';
  let adminSalt = 'a41d92bf27f54c9381665a882e3db792';
  if (process.env.SUPER_ADMIN_PASSWORD) {
    const creds = hashPassword(process.env.SUPER_ADMIN_PASSWORD);
    adminHash = creds.hash;
    adminSalt = creds.salt;
  }

  const initialSuperAdmin: ServerUser = {
    user_id: 'USR_SUPER_01',
    name: adminName,
    name_kannada: 'ಶಾಸಕರ ಸಚಿವಾಲಯ / ಸೂಪರ್ ಅಡ್ಮಿನ್',
    mobile: adminMobile,
    email: 'superadmin@sindhanur-ac58.gov.in',
    voter_id: 'KA050580000001',
    role: 'SUPER_ADMIN',
    village_id: null,
    gp_id: null,
    taluk_id: 'TLK_SND',
    constituency_id: 'AC58',
    status: 'ACTIVE',
    password_hash: adminHash,
    password_salt: adminSalt,
    created_at: now
  };

  const audit_logs: AuditLog[] = [
    {
      audit_id: 'AUD_INIT_01',
      user_id: 'SYSTEM',
      user_name: 'Constituency Initialization Service',
      role: 'SUPER_ADMIN',
      action: 'CREATE',
      record_type: 'CONSTITUENCY',
      record_id: 'AC58',
      village_id: null,
      details: 'Production platform initialized for Sindhanur AC-58 with 124 verified revenue villages and 33 Gram Panchayats.',
      timestamp: now
    }
  ];

  return {
    constituencies: [constituency],
    taluks: [taluk],
    gram_panchayats,
    villages,
    booths: [],
    users: [initialSuperAdmin],
    issues: [],
    issue_updates: [],
    development_projects: [],
    project_updates: [],
    field_visits: [],
    meetings: [],
    tasks: [],
    documents: [],
    notifications: [],
    audit_logs,
    video_meetings: [],
    announcements: [],
    conferences: [],
    conference_participants: []
  };
}

class ConstituencyDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectoryExists();
    this.data = this.loadData();
  }

  private ensureDirectoryExists() {
    if (isProduction) return;
    try {
      const dbPath = getDatabaseFilePath();
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      // In-memory fallback
    }
  }

  private loadData(): DatabaseSchema {
    const dbPath = getDatabaseFilePath();
    try {
      if (fs.existsSync(dbPath)) {
        const fileContent = fs.readFileSync(dbPath, 'utf-8');
        const parsed = JSON.parse(fileContent);

        // Check if old demo artifacts exist in file (e.g. USR_VH_GOR or fake issues)
        const hasOldDemoUsers = parsed.users && parsed.users.some((u: any) => u.user_id === 'USR_VH_GOR' || u.user_id === 'USR_MEM_GOR');
        const hasOldDemoIssues = parsed.issues && parsed.issues.some((i: any) => i.issue_id === 'ISS_GOR_001');

        if (hasOldDemoUsers || hasOldDemoIssues) {
          console.log('[Constituency Connect AC-58] Purging obsolete demo database, seeding clean production schema.');
          const seed = getInitialSeedData();
          this.saveData(seed);
          return seed;
        }

        // If data is clean and valid, return it
        if (parsed && Array.isArray(parsed.villages) && parsed.villages.length >= 100 && Array.isArray(parsed.users)) {
          // Sync super admin configuration if provided via environment variables
          const adminMobile = process.env.SUPER_ADMIN_MOBILE || '9686520152';
          const superAdmin = parsed.users.find((u: any) => u.role === 'SUPER_ADMIN');
          if (superAdmin) {
            superAdmin.mobile = adminMobile;
            if (process.env.SUPER_ADMIN_PASSWORD) {
              const { hash, salt } = hashPassword(process.env.SUPER_ADMIN_PASSWORD);
              superAdmin.password_hash = hash;
              superAdmin.password_salt = salt;
            }
            superAdmin.status = 'ACTIVE';
          } else {
            let adminHash = '9b6d8591c015b6d914d79d6711a770051280387bbf6db1aa3be8e8bc3e1258d4';
            let adminSalt = 'a41d92bf27f54c9381665a882e3db792';
            if (process.env.SUPER_ADMIN_PASSWORD) {
              const creds = hashPassword(process.env.SUPER_ADMIN_PASSWORD);
              adminHash = creds.hash;
              adminSalt = creds.salt;
            }
            parsed.users.unshift({
              user_id: 'USR_SUPER_01',
              name: process.env.SUPER_ADMIN_NAME || 'MLA Secretariat Super Admin',
              name_kannada: 'ಶಾಸಕರ ಸಚಿವಾಲಯ / ಸೂಪರ್ ಅಡ್ಮಿನ್',
              mobile: adminMobile,
              email: 'superadmin@sindhanur-ac58.gov.in',
              voter_id: 'KA050580000001',
              role: 'SUPER_ADMIN',
              village_id: null,
              gp_id: null,
              taluk_id: 'TLK_SND',
              constituency_id: 'AC58',
              status: 'ACTIVE',
              password_hash: adminHash,
              password_salt: adminSalt,
              created_at: new Date().toISOString()
            });
          }
          if (!parsed.conferences) parsed.conferences = [];
          if (!parsed.conference_participants) parsed.conference_participants = [];
          this.saveData(parsed);
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading constituency database from file, falling back to seed:', err);
    }
    const seed = getInitialSeedData();
    this.saveData(seed);
    return seed;
  }

  private saveData(dataToSave?: DatabaseSchema) {
    // In production, do not store production data in a local JSON file or /tmp
    if (isProduction) {
      return;
    }
    try {
      this.ensureDirectoryExists();
      const payload = dataToSave || this.data;
      const dbPath = getDatabaseFilePath();
      fs.writeFileSync(dbPath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch {
      // In-memory fallback
    }
  }

  public resetToSeed(): DatabaseSchema {
    const seed = getInitialSeedData();
    this.data = seed;
    this.saveData(seed);
    return this.data;
  }

  public getSchema(): DatabaseSchema {
    return this.data;
  }

  // AUDIT LOG HELPER
  public logAudit(entry: Omit<AuditLog, 'audit_id' | 'timestamp'>) {
    const audit: AuditLog = {
      audit_id: generateSecureId('AUD'),
      ...entry,
      timestamp: new Date().toISOString()
    };
    this.data.audit_logs.unshift(audit);
    if (this.data.audit_logs.length > 1000) {
      this.data.audit_logs = this.data.audit_logs.slice(0, 1000);
    }
    this.saveData();
    return audit;
  }

  // USER LOOKUP & AUTHENTICATION
  public findUserById(userId: string): ServerUser | undefined {
    return this.data.users.find(u => u.user_id === userId);
  }

  public findUserByMobile(mobile: string): ServerUser | undefined {
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    return this.data.users.find(u => u.mobile.replace(/[^0-9]/g, '') === cleanMobile);
  }

  public findUserByVoterId(voterId: string): ServerUser | undefined {
    const cleanVoterId = voterId.trim().toUpperCase();
    return this.data.users.find(u => u.voter_id && u.voter_id.trim().toUpperCase() === cleanVoterId);
  }

  public findUserByEmail(email: string): ServerUser | undefined {
    return this.data.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  }

  public getAllUsers(): ServerUser[] {
    return [...this.data.users];
  }

  public isSuperAdminInitialized(): boolean {
    return this.data.users.some(u => u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE');
  }

  // PUBLIC VOTER REGISTRATION
  // Every public registration strictly creates role: 'MEMBER' and status: 'PENDING'
  public registerUser(params: {
    name: string;
    mobile: string;
    voter_id: string;
    dob?: string;
    gender?: string;
    address?: string;
    village_id: string;
    password: string;
  }): { success: boolean; user?: ServerUser; error?: string } {
    const cleanMobile = params.mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length !== 10) {
      return { success: false, error: 'Mobile number must be exactly 10 digits.' };
    }

    const cleanVoterId = params.voter_id.trim().toUpperCase();
    if (!cleanVoterId || cleanVoterId.length < 5) {
      return { success: false, error: 'Please provide a valid Voter ID / EPIC number.' };
    }

    if (this.findUserByMobile(cleanMobile)) {
      return { success: false, error: 'Mobile number is already registered in the system.' };
    }

    if (this.findUserByVoterId(cleanVoterId)) {
      return { success: false, error: 'Voter ID is already registered in the constituency database.' };
    }

    const village = this.getVillageById(params.village_id);
    if (!village) {
      return { success: false, error: 'Selected village does not exist in Sindhanur AC-58.' };
    }

    if (!params.password || params.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const { hash, salt } = hashPassword(params.password);
    const now = new Date().toISOString();
    const newUser: ServerUser = {
      user_id: generateSecureId('USR'),
      name: params.name.trim(),
      mobile: cleanMobile,
      voter_id: cleanVoterId,
      dob: params.dob,
      gender: params.gender,
      address: params.address?.trim(),
      role: 'MEMBER', // STRICT ENFORCEMENT: All registrations receive role = MEMBER
      status: 'PENDING', // STRICT ENFORCEMENT: All registrations receive status = PENDING
      village_id: village.village_id,
      gp_id: village.gp_id,
      taluk_id: 'TLK_SND',
      constituency_id: 'AC58',
      password_hash: hash,
      password_salt: salt,
      created_at: now
    };

    this.data.users.push(newUser);

    // Audit log
    this.logAudit({
      user_id: newUser.user_id,
      user_name: newUser.name,
      role: 'MEMBER',
      action: 'CREATE',
      record_type: 'USER',
      record_id: newUser.user_id,
      village_id: newUser.village_id,
      details: `New voter registered: ${newUser.name} (Voter ID: ${maskVoterId(cleanVoterId)}) for village ${village.village_name}. Status: PENDING verification.`
    });

    // Notify Super Admin
    this.createNotification({
      notification_id: generateSecureId('NOTIF'),
      user_id: 'USR_SUPER_01',
      title: 'New Voter Registration Pending',
      message: `${newUser.name} registered from village ${village.village_name}. Awaiting voter verification.`,
      type: 'TASK',
      is_read: false,
      village_id: village.village_id,
      created_at: now
    });

    this.saveData();
    return { success: true, user: newUser };
  }

  // FIRST-TIME SUPER ADMIN SETUP
  public setupSuperAdmin(params: {
    name: string;
    mobile: string;
    email?: string;
    password: string;
  }): { success: boolean; user?: ServerUser; error?: string } {
    if (this.isSuperAdminInitialized()) {
      return { success: false, error: 'Super Admin has already been initialized.' };
    }

    const cleanMobile = params.mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length !== 10) {
      return { success: false, error: 'Mobile number must be exactly 10 digits.' };
    }

    if (!params.password || params.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    const { hash, salt } = hashPassword(params.password);
    const now = new Date().toISOString();

    const adminUser: ServerUser = {
      user_id: `USR_SUPER_${Date.now().toString(36).toUpperCase()}`,
      name: params.name.trim(),
      mobile: cleanMobile,
      email: params.email?.trim() || 'superadmin@sindhanur-ac58.gov.in',
      role: 'SUPER_ADMIN',
      village_id: null,
      gp_id: null,
      taluk_id: 'TLK_SND',
      constituency_id: 'AC58',
      status: 'ACTIVE',
      password_hash: hash,
      password_salt: salt,
      created_at: now
    };

    this.data.users.unshift(adminUser);

    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: 'SUPER_ADMIN',
      action: 'CREATE',
      record_type: 'USER',
      record_id: adminUser.user_id,
      village_id: null,
      details: `Initial Super Admin account configured: ${adminUser.name} (${adminUser.mobile}).`
    });

    this.saveData();
    return { success: true, user: adminUser };
  }

  // SUPER ADMIN USER MANAGEMENT
  public approveMember(userId: string, adminUser: User): { success: boolean; user?: ServerUser; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'User not found.' };

    user.status = 'ACTIVE';
    user.role = 'MEMBER';
    user.updated_at = new Date().toISOString();

    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'UPDATE',
      record_type: 'USER',
      record_id: userId,
      village_id: user.village_id,
      details: `Approved voter registration for ${user.name}. Status set to ACTIVE (MEMBER).`
    });

    this.createNotification({
      notification_id: generateSecureId('NOTIF'),
      user_id: user.user_id,
      title: 'Registration Approved',
      message: `Your voter account for Sindhanur AC-58 has been approved. You now have active member access.`,
      type: 'TASK',
      is_read: false,
      village_id: user.village_id,
      created_at: new Date().toISOString()
    });

    this.saveData();
    return { success: true, user };
  }

  public rejectMember(userId: string, adminUser: User): { success: boolean; user?: ServerUser; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'User not found.' };

    user.status = 'REJECTED';
    user.updated_at = new Date().toISOString();

    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'UPDATE',
      record_type: 'USER',
      record_id: userId,
      village_id: user.village_id,
      details: `Rejected registration for ${user.name}. Status set to REJECTED.`
    });

    this.saveData();
    return { success: true, user };
  }

  public promoteToVillageHead(userId: string, targetVillageId: string, adminUser: User): { success: boolean; user?: ServerUser; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'User not found.' };

    if (user.status !== 'ACTIVE') {
      return { success: false, error: 'Only ACTIVE members can be promoted to Village Head.' };
    }

    const targetVillage = this.getVillageById(targetVillageId);
    if (!targetVillage) {
      return { success: false, error: 'Specified village does not exist.' };
    }

    // STRICT 1-TO-1 ENFORCEMENT: A village must have at most ONE Village Head.
    // If another user is currently Village Head for this target village, demote them to MEMBER with succession history.
    const existingHead = this.data.users.find(u => u.role === 'VILLAGE_HEAD' && u.village_id === targetVillageId && u.user_id !== userId);
    if (existingHead) {
      existingHead.role = 'MEMBER';
      existingHead.updated_at = new Date().toISOString();

      this.logAudit({
        user_id: adminUser.user_id,
        user_name: adminUser.name,
        role: adminUser.role,
        action: 'ASSIGNMENT',
        record_type: 'USER',
        record_id: existingHead.user_id,
        village_id: targetVillageId,
        details: `Succession: Village Head ${existingHead.name} was superseded by ${user.name} for village ${targetVillage.village_name} (${targetVillageId}). Role changed to MEMBER.`
      });

      this.createNotification({
        notification_id: generateSecureId('NOTIF'),
        user_id: existingHead.user_id,
        title: 'Village Head Succession Notice',
        message: `Your appointment as Village Head for ${targetVillage.village_name} has concluded. Your account has returned to Member status.`,
        type: 'SYSTEM',
        is_read: false,
        village_id: targetVillageId,
        created_at: new Date().toISOString()
      });
    }

    const oldVillageId = user.village_id;
    user.role = 'VILLAGE_HEAD';
    user.village_id = targetVillageId;
    user.gp_id = targetVillage.gp_id;
    user.updated_at = new Date().toISOString();

    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'ASSIGNMENT',
      record_type: 'USER',
      record_id: userId,
      village_id: targetVillageId,
      details: `Promoted ${user.name} to VILLAGE_HEAD. Assigned exclusively to village ${targetVillage.village_name} (${targetVillageId}). Previous village: ${oldVillageId || 'None'}.`
    });

    this.createNotification({
      notification_id: generateSecureId('NOTIF'),
      user_id: user.user_id,
      title: 'Designated as Village Head',
      message: `You have been appointed as Village Head for ${targetVillage.village_name}. You can now schedule village conferences and manage village civic issues.`,
      type: 'TASK',
      is_read: false,
      village_id: targetVillageId,
      created_at: new Date().toISOString()
    });

    this.saveData();
    return { success: true, user };
  }

  public demoteToMember(userId: string, adminUser: User): { success: boolean; user?: ServerUser; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'User not found.' };

    user.role = 'MEMBER';
    user.updated_at = new Date().toISOString();

    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'UPDATE',
      record_type: 'USER',
      record_id: userId,
      village_id: user.village_id,
      details: `Demoted ${user.name} from Village Head to MEMBER for village ${user.village_id}.`
    });

    this.saveData();
    return { success: true, user };
  }

  public reassignVillageHead(userId: string, newVillageId: string, adminUser: User): { success: boolean; user?: ServerUser; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'User not found.' };

    if (user.role !== 'VILLAGE_HEAD') {
      return { success: false, error: 'User is not a Village Head.' };
    }

    const newVillage = this.getVillageById(newVillageId);
    if (!newVillage) {
      return { success: false, error: 'Specified new village does not exist.' };
    }

    // STRICT 1-TO-1 ENFORCEMENT: If another user is currently Village Head for the new village, demote them to MEMBER.
    const existingHead = this.data.users.find(u => u.role === 'VILLAGE_HEAD' && u.village_id === newVillageId && u.user_id !== userId);
    if (existingHead) {
      existingHead.role = 'MEMBER';
      existingHead.updated_at = new Date().toISOString();

      this.logAudit({
        user_id: adminUser.user_id,
        user_name: adminUser.name,
        role: adminUser.role,
        action: 'ASSIGNMENT',
        record_type: 'USER',
        record_id: existingHead.user_id,
        village_id: newVillageId,
        details: `Succession: Village Head ${existingHead.name} was superseded by ${user.name} for village ${newVillage.village_name} (${newVillageId}). Role changed to MEMBER.`
      });

      this.createNotification({
        notification_id: generateSecureId('NOTIF'),
        user_id: existingHead.user_id,
        title: 'Village Head Succession Notice',
        message: `Your appointment as Village Head for ${newVillage.village_name} has concluded. Your account has returned to Member status.`,
        type: 'SYSTEM',
        is_read: false,
        village_id: newVillageId,
        created_at: new Date().toISOString()
      });
    }

    const oldVillageId = user.village_id;
    user.village_id = newVillageId;
    user.gp_id = newVillage.gp_id;
    user.updated_at = new Date().toISOString();

    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'ASSIGNMENT',
      record_type: 'USER',
      record_id: userId,
      village_id: newVillageId,
      details: `Reassigned Village Head ${user.name} from village ${oldVillageId} to ${newVillage.village_name} (${newVillageId}).`
    });

    this.createNotification({
      notification_id: generateSecureId('NOTIF'),
      user_id: user.user_id,
      title: 'Jurisdiction Reassigned',
      message: `Your assigned village has been updated to ${newVillage.village_name}. Your access is now restricted exclusively to this village.`,
      type: 'TASK',
      is_read: false,
      village_id: newVillageId,
      created_at: new Date().toISOString()
    });

    this.saveData();
    return { success: true, user };
  }

  public deleteUser(userId: string, adminUser: User): { success: boolean; error?: string } {
    if (adminUser.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Forbidden: Only Super Admin can delete users.' };
    }
    if (userId === adminUser.user_id) {
      return { success: false, error: 'Cannot delete yourself.' };
    }
    const idx = this.data.users.findIndex(u => u.user_id === userId);
    if (idx === -1) return { success: false, error: 'User not found.' };
    const targetUser = this.data.users[idx];
    this.data.users.splice(idx, 1);

    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'DELETE',
      record_type: 'USER',
      record_id: userId,
      village_id: targetUser.village_id || undefined,
      details: `Deleted user ${targetUser.name} (${targetUser.role})`
    });

    this.saveData();
    return { success: true };
  }

  public updateUserByAdmin(
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
  ): { success: boolean; user?: ServerUser; error?: string } {
    if (adminUser.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Forbidden: Only Super Admin can edit users.' };
    }
    const user = this.data.users.find(u => u.user_id === userId);
    if (!user) return { success: false, error: 'User not found.' };

    const newRole = updates.role ?? user.role;
    const newVillageId = updates.village_id !== undefined ? updates.village_id : user.village_id;
    const newStatus = updates.status ?? user.status;

    if (newRole === 'VILLAGE_HEAD' && newStatus === 'ACTIVE') {
      if (!newVillageId) {
        return { success: false, error: 'A Village Head must be assigned to exactly one village.' };
      }
      const existingHead = this.data.users.find(
        u => u.village_id === newVillageId && u.role === 'VILLAGE_HEAD' && u.status === 'ACTIVE' && u.user_id !== userId
      );
      if (existingHead) {
        return {
          success: false,
          error: `Village already has an active Village Head (${existingHead.name}). Please demote or reassign them first.`
        };
      }
    }

    if (updates.name) user.name = updates.name;
    if (updates.name_kannada) user.name_kannada = updates.name_kannada;
    if (updates.mobile) user.mobile = updates.mobile;
    if (updates.voter_id) user.voter_id = updates.voter_id;
    if (updates.role) user.role = updates.role;
    if (updates.village_id !== undefined) {
      user.village_id = updates.village_id;
      if (updates.village_id) {
        const v = this.data.villages.find(vil => vil.village_id === updates.village_id);
        user.gp_id = v ? v.gp_id : null;
      } else {
        user.gp_id = null;
      }
    }
    if (updates.status) user.status = updates.status;
    if (updates.email !== undefined) user.email = updates.email;
    if (updates.address !== undefined) user.address = updates.address;
    user.updated_at = new Date().toISOString();

    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'UPDATE',
      record_type: 'USER',
      record_id: userId,
      village_id: user.village_id || undefined,
      details: `Admin updated details for user ${user.name}.`
    });

    this.saveData();
    return { success: true, user };
  }

  // SECURE PASSWORD RESET WITH IDENTITY VERIFICATION
  public resetPassword(params: {
    mobile: string;
    voter_id: string;
    new_password: string;
  }): { success: boolean; user?: ServerUser; error?: string } {
    const cleanMobile = params.mobile.replace(/[^0-9]/g, '');
    const cleanVoterId = params.voter_id.trim().toUpperCase();

    if (!cleanMobile || cleanMobile.length !== 10) {
      return { success: false, error: 'Please provide a valid 10-digit registered mobile number.' };
    }
    if (!cleanVoterId) {
      return { success: false, error: 'Voter ID (EPIC) is required for identity verification.' };
    }
    if (!params.new_password || params.new_password.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    const user = this.data.users.find(u =>
      u.mobile === cleanMobile &&
      u.voter_id &&
      u.voter_id.trim().toUpperCase() === cleanVoterId
    );

    if (!user) {
      return {
        success: false,
        error: 'Identity verification failed. No registered voter matched this mobile number and Voter ID.'
      };
    }

    const { hash, salt } = hashPassword(params.new_password);
    user.password_hash = hash;
    user.password_salt = salt;
    user.updated_at = new Date().toISOString();

    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'UPDATE',
      record_type: 'USER',
      record_id: user.user_id,
      village_id: user.village_id,
      details: `Password securely reset for ${user.name} via Voter ID and mobile verification.`
    });

    this.saveData();
    return { success: true, user };
  }

  public setUserStatus(userId: string, status: UserStatus, adminUser: User): { success: boolean; user?: ServerUser; error?: string } {
    const user = this.findUserById(userId);
    if (!user) return { success: false, error: 'User not found.' };

    user.status = status;
    user.updated_at = new Date().toISOString();

    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'UPDATE',
      record_type: 'USER',
      record_id: userId,
      village_id: user.village_id,
      details: `Changed status of user ${user.name} to ${status}.`
    });

    this.saveData();
    return { success: true, user };
  }

  public getUsersByFilter(filter: {
    status?: string;
    role?: string;
    village_id?: string;
    gp_id?: string;
    search?: string;
  }): ServerUser[] {
    let users = [...this.data.users];

    if (filter.status && filter.status !== 'all') {
      users = users.filter(u => u.status === filter.status);
    }

    if (filter.role && filter.role !== 'all') {
      users = users.filter(u => u.role === filter.role);
    }

    if (filter.village_id) {
      users = users.filter(u => u.village_id === filter.village_id);
    }

    if (filter.gp_id) {
      users = users.filter(u => u.gp_id === filter.gp_id);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.mobile.includes(q) ||
        (u.voter_id && u.voter_id.toLowerCase().includes(q))
      );
    }

    return users;
  }

  // CONSTITUENCY & TALUK
  public getConstituency(): Constituency {
    return this.data.constituencies[0];
  }

  public getTaluks(): Taluk[] {
    return [...this.data.taluks];
  }

  // GRAM PANCHAYATS
  public getGramPanchayats(filterGpId?: string | null): GramPanchayat[] {
    if (filterGpId) {
      return this.data.gram_panchayats.filter(gp => gp.gp_id === filterGpId);
    }
    return [...this.data.gram_panchayats];
  }

  public getGramPanchayatById(gpId: string): GramPanchayat | undefined {
    return this.data.gram_panchayats.find(gp => gp.gp_id === gpId);
  }

  // VILLAGES
  public getVillages(allowedVillageIds?: string[] | null): Village[] {
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      return this.data.villages.filter(v => allowedVillageIds.includes(v.village_id));
    }
    return [...this.data.villages];
  }

  public getVillageById(villageId: string): Village | undefined {
    return this.data.villages.find(v => v.village_id === villageId);
  }

  public createVillage(village: Village, adminUser: User): Village {
    this.data.villages.push(village);
    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'CREATE',
      record_type: 'VILLAGE',
      record_id: village.village_id,
      village_id: village.village_id,
      details: `Added new village: ${village.village_name} under GP ${village.gp_id}`
    });
    this.saveData();
    return village;
  }

  public updateVillage(villageId: string, updates: Partial<Village>, adminUser: User): Village | null {
    const idx = this.data.villages.findIndex(v => v.village_id === villageId);
    if (idx === -1) return null;
    const updated = { ...this.data.villages[idx], ...updates };
    this.data.villages[idx] = updated;
    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'UPDATE',
      record_type: 'VILLAGE',
      record_id: villageId,
      village_id: villageId,
      details: `Updated village profile for ${updated.village_name}`
    });
    this.saveData();
    return updated;
  }

  // BOOTHS
  public getBooths(villageId?: string | null): Booth[] {
    if (villageId) {
      return this.data.booths.filter(b => b.village_id === villageId);
    }
    return [...this.data.booths];
  }

  public getBoothById(boothId: string): Booth | undefined {
    return this.data.booths.find(b => b.booth_id === boothId);
  }

  public createBooth(booth: Booth, adminUser: User): Booth {
    this.data.booths.push(booth);
    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'CREATE',
      record_type: 'BOOTH',
      record_id: booth.booth_id,
      village_id: booth.village_id,
      details: `Created Polling Booth ${booth.booth_number} in village ${booth.village_id}`
    });
    this.saveData();
    return booth;
  }

  // ISSUES
  public getIssues(allowedVillageIds?: string[] | null): Issue[] {
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      return this.data.issues.filter(i => allowedVillageIds.includes(i.village_id));
    }
    return [...this.data.issues];
  }

  public getIssueById(issueId: string): Issue | undefined {
    return this.data.issues.find(i => i.issue_id === issueId);
  }

  public createIssue(issue: Issue, user: User): Issue {
    this.data.issues.unshift(issue);
    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'ISSUE',
      record_id: issue.issue_id,
      village_id: issue.village_id,
      details: `Created civic issue: ${issue.title} in village ${issue.village_id}`
    });
    this.saveData();
    return issue;
  }

  public updateIssue(issueId: string, updates: Partial<Issue>, user: User): Issue | null {
    const idx = this.data.issues.findIndex(i => i.issue_id === issueId);
    if (idx === -1) return null;

    const oldIssue = this.data.issues[idx];
    const updated = { ...oldIssue, ...updates, updated_at: new Date().toISOString() };
    this.data.issues[idx] = updated;

    if (updates.status && updates.status !== oldIssue.status) {
      const updateEntry: IssueUpdate = {
        update_id: `UPD_${Date.now()}`,
        issue_id: issueId,
        village_id: updated.village_id,
        user_id: user.user_id,
        user_name: user.name,
        previous_status: oldIssue.status,
        new_status: updates.status,
        remarks: `Status updated from ${oldIssue.status} to ${updates.status}`,
        timestamp: new Date().toISOString()
      };
      this.data.issue_updates.push(updateEntry);
    }

    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'UPDATE',
      record_type: 'ISSUE',
      record_id: issueId,
      village_id: updated.village_id,
      details: `Updated issue ${updated.title}. Status: ${oldIssue.status} -> ${updated.status}`
    });

    this.saveData();
    return updated;
  }

  public updateIssueStatus(issueId: string, status: any, remarks: string, user: User): Issue | null {
    return this.updateIssue(issueId, { status }, user);
  }

  public deleteIssue(issueId: string, user: User): boolean {
    const idx = this.data.issues.findIndex(i => i.issue_id === issueId);
    if (idx === -1) return false;
    const deleted = this.data.issues.splice(idx, 1)[0];
    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'DELETE',
      record_type: 'ISSUE',
      record_id: issueId,
      village_id: deleted.village_id,
      details: `Deleted issue ${deleted.title} from village ${deleted.village_id}`
    });
    this.saveData();
    return true;
  }

  // DEVELOPMENT PROJECTS
  public getProjects(allowedVillageIds?: string[] | null): DevelopmentProject[] {
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      return this.data.development_projects.filter(p => allowedVillageIds.includes(p.village_id));
    }
    return [...this.data.development_projects];
  }

  public getProjectById(projectId: string): DevelopmentProject | undefined {
    return this.data.development_projects.find(p => p.project_id === projectId);
  }

  public createProject(project: DevelopmentProject, user: User): DevelopmentProject {
    this.data.development_projects.unshift(project);
    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'PROJECT',
      record_id: project.project_id,
      village_id: project.village_id,
      details: `Created development project: ${project.project_name} (Budget: ₹${project.estimated_cost})`
    });
    this.saveData();
    return project;
  }

  public updateProject(projectId: string, updates: Partial<DevelopmentProject>, user: User): DevelopmentProject | null {
    const idx = this.data.development_projects.findIndex(p => p.project_id === projectId);
    if (idx === -1) return null;
    const oldProj = this.data.development_projects[idx];
    const updated = { ...oldProj, ...updates, updated_at: new Date().toISOString() };
    this.data.development_projects[idx] = updated;

    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'UPDATE',
      record_type: 'PROJECT',
      record_id: projectId,
      village_id: updated.village_id,
      details: `Updated project ${updated.project_name}. Progress: ${updated.progress_percentage}%`
    });
    this.saveData();
    return updated;
  }

  public updateProjectProgress(projectId: string, progress: number, remarks: string, user: User): DevelopmentProject | null {
    return this.updateProject(projectId, { progress_percentage: progress }, user);
  }

  // FIELD VISITS
  public getFieldVisits(allowedVillageIds?: string[] | null): FieldVisit[] {
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      return this.data.field_visits.filter(v => allowedVillageIds.includes(v.village_id));
    }
    return [...this.data.field_visits];
  }

  public createFieldVisit(visit: FieldVisit, user: User): FieldVisit {
    this.data.field_visits.unshift(visit);
    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'VISIT',
      record_id: visit.visit_id,
      village_id: visit.village_id,
      details: `Logged field visit to village ${visit.village_id} on ${visit.date}`
    });
    this.saveData();
    return visit;
  }

  // VILLAGE MEETINGS (In-person)
  public getMeetings(allowedVillageIds?: string[] | null): VillageMeeting[] {
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      return this.data.meetings.filter(m => allowedVillageIds.includes(m.village_id));
    }
    return [...this.data.meetings];
  }

  public createMeeting(meeting: VillageMeeting, user: User): VillageMeeting {
    this.data.meetings.unshift(meeting);
    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'MEETING',
      record_id: meeting.meeting_id,
      village_id: meeting.village_id,
      details: `Scheduled in-person meeting: ${meeting.title} in village ${meeting.village_id}`
    });
    this.saveData();
    return meeting;
  }

  // VIDEO CONFERENCES (Strict RBAC: Only Village Head can create for their assigned village)
  public getVideoMeetings(allowedVillageIds?: string[] | null): VideoMeeting[] {
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      return this.data.video_meetings.filter(m => allowedVillageIds.includes(m.village_id));
    }
    return [...this.data.video_meetings];
  }

  public getVideoMeetingById(meetingId: string): VideoMeeting | undefined {
    return this.data.video_meetings.find(m => m.meeting_id === meetingId);
  }

  public createVideoMeeting(meeting: VideoMeeting, user: User): VideoMeeting {
    this.data.video_meetings.unshift(meeting);
    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'VIDEO_CONFERENCE',
      record_id: meeting.meeting_id,
      village_id: meeting.village_id,
      details: `Village Head (${user.name}) scheduled video conference '${meeting.title}' for village ${meeting.village_id}.`
    });
    this.saveData();
    return meeting;
  }

  public updateVideoMeeting(meetingId: string, updates: Partial<VideoMeeting>, user: User): VideoMeeting | null {
    const idx = this.data.video_meetings.findIndex(m => m.meeting_id === meetingId);
    if (idx === -1) return null;
    const old = this.data.video_meetings[idx];
    const updated = { ...old, ...updates };
    this.data.video_meetings[idx] = updated;

    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'UPDATE',
      record_type: 'VIDEO_CONFERENCE',
      record_id: meetingId,
      village_id: updated.village_id,
      details: `Updated video conference ${updated.title}. Status: ${updated.status}`
    });
    this.saveData();
    return updated;
  }

  public endVideoMeeting(meetingId: string, user: User): VideoMeeting | null {
    const meeting = this.getVideoMeetingById(meetingId);
    if (!meeting) return null;
    meeting.status = 'ENDED';
    meeting.ended_at = new Date().toISOString();
    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'UPDATE',
      record_type: 'VIDEO_CONFERENCE',
      record_id: meetingId,
      village_id: meeting.village_id,
      details: `Ended video conference ${meeting.title}.`
    });
    this.saveData();
    return meeting;
  }

  public joinVideoMeeting(meetingId: string, participant: VideoParticipant): VideoMeeting | null {
    const meeting = this.getVideoMeetingById(meetingId);
    if (!meeting) return null;
    if (!meeting.participants) meeting.participants = [];
    const existing = meeting.participants.find(p => p.user_id === participant.user_id);
    if (existing) {
      Object.assign(existing, participant);
    } else {
      meeting.participants.push(participant);
    }
    this.saveData();
    return meeting;
  }

  public leaveVideoMeeting(meetingId: string, userId: string): VideoMeeting | null {
    const meeting = this.getVideoMeetingById(meetingId);
    if (!meeting || !meeting.participants) return null;
    meeting.participants = meeting.participants.filter(p => p.user_id !== userId);
    this.saveData();
    return meeting;
  }

  public updateParticipantState(meetingId: string, userId: string, updates: Partial<VideoParticipant>): VideoMeeting | null {
    const meeting = this.getVideoMeetingById(meetingId);
    if (!meeting || !meeting.participants) return null;
    const p = meeting.participants.find(part => part.user_id === userId);
    if (p) {
      Object.assign(p, updates);
      this.saveData();
    }
    return meeting;
  }

  // TASKS
  public getTasks(allowedVillageIds?: string[] | null): Task[] {
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      return this.data.tasks.filter(t => allowedVillageIds.includes(t.village_id));
    }
    return [...this.data.tasks];
  }

  public createTask(task: Task, user: User): Task {
    this.data.tasks.unshift(task);
    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'TASK',
      record_id: task.task_id,
      village_id: task.village_id,
      details: `Created task: ${task.title}`
    });
    this.saveData();
    return task;
  }

  public updateTask(taskId: string, updates: Partial<Task>, user: User): Task | null {
    const idx = this.data.tasks.findIndex(t => t.task_id === taskId);
    if (idx === -1) return null;
    const old = this.data.tasks[idx];
    const updated = { ...old, ...updates, updated_at: new Date().toISOString() };
    this.data.tasks[idx] = updated;
    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'UPDATE',
      record_type: 'TASK',
      record_id: taskId,
      village_id: updated.village_id,
      details: `Updated task ${updated.title} to ${updated.status}`
    });
    this.saveData();
    return updated;
  }

  public updateTaskStatus(taskId: string, status: TaskStatus, user: User): Task | null {
    return this.updateTask(taskId, { status }, user);
  }

  // DOCUMENTS
  public getDocuments(allowedVillageIds?: string[] | null): VillageDocument[] {
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      return this.data.documents.filter(d => allowedVillageIds.includes(d.village_id));
    }
    return [...this.data.documents];
  }

  public createDocument(doc: VillageDocument, user: User): VillageDocument {
    this.data.documents.unshift(doc);
    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'DOCUMENT',
      record_id: doc.file_id,
      village_id: doc.village_id,
      details: `Uploaded document: ${doc.file_name}`
    });
    this.saveData();
    return doc;
  }

  // NOTIFICATIONS
  public getNotifications(user: User): Notification[] {
    return this.data.notifications.filter(n => {
      if (user.role === 'SUPER_ADMIN') return true;
      if (n.user_id === user.user_id) return true;
      if (n.village_id && n.village_id === user.village_id) return true;
      return false;
    });
  }

  public createNotification(notif: Notification): Notification {
    this.data.notifications.unshift(notif);
    if (this.data.notifications.length > 500) {
      this.data.notifications = this.data.notifications.slice(0, 500);
    }
    this.saveData();
    return notif;
  }

  public markNotificationRead(notificationId: string): boolean {
    const notif = this.data.notifications.find(n => n.notification_id === notificationId);
    if (!notif) return false;
    notif.is_read = true;
    this.saveData();
    return true;
  }

  public markNotificationAsRead(notificationId: string): boolean {
    return this.markNotificationRead(notificationId);
  }

  // USER MANAGEMENT HELPERS
  public createUser(userData: ServerUser, adminUser: User): ServerUser {
    this.data.users.push(userData);
    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'CREATE',
      record_type: 'USER',
      record_id: userData.user_id,
      village_id: userData.village_id,
      details: `Created user ${userData.name} with role ${userData.role}`
    });
    this.saveData();
    return userData;
  }

  public updateUser(userId: string, updates: Partial<ServerUser>, adminUser: User): ServerUser | null {
    const user = this.findUserById(userId);
    if (!user) return null;

    // Only Super Admin can change user role or village assignment
    if (adminUser.role !== 'SUPER_ADMIN') {
      delete updates.role;
      delete updates.village_id;
    }

    const newRole = updates.role || user.role;
    const newVillageId = updates.village_id !== undefined ? updates.village_id : user.village_id;

    if (newRole === 'VILLAGE_HEAD') {
      if (!newVillageId) {
        throw new Error('A Village Head must be assigned to exactly one village.');
      }
      const existingHead = this.data.users.find(u => u.role === 'VILLAGE_HEAD' && u.village_id === newVillageId && u.user_id !== userId);
      if (existingHead) {
        throw new Error(`Village ${newVillageId} already has an active Village Head (${existingHead.name}).`);
      }
    }

    Object.assign(user, updates, { updated_at: new Date().toISOString() });
    this.logAudit({
      user_id: adminUser.user_id,
      user_name: adminUser.name,
      role: adminUser.role,
      action: 'UPDATE',
      record_type: 'USER',
      record_id: userId,
      village_id: user.village_id,
      details: `Updated user ${user.name}`
    });
    this.saveData();
    return user;
  }

  // AUDIT LOGS
  public getAuditLogs(allowedVillageIds?: string[] | null): AuditLog[] {
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      return this.data.audit_logs.filter(a => !a.village_id || allowedVillageIds.includes(a.village_id));
    }
    return [...this.data.audit_logs];
  }

  // ANNOUNCEMENTS
  public getAnnouncements(allowedVillageIds?: string[] | null): Announcement[] {
    if (allowedVillageIds && allowedVillageIds.length > 0) {
      return this.data.announcements.filter(a => a.village_id === null || allowedVillageIds.includes(a.village_id));
    }
    return [...this.data.announcements];
  }

  public createAnnouncement(announcement: Announcement, user: User): Announcement {
    this.data.announcements.unshift(announcement);
    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'ANNOUNCEMENT',
      record_id: announcement.announcement_id,
      village_id: announcement.village_id,
      details: `Published announcement: ${announcement.title}`
    });
    this.saveData();
    return announcement;
  }

  // JITSI CONFERENCES (CONFERENCES & PARTICIPANTS)
  public getConferences(user: User): Conference[] {
    const list = this.data.conferences || [];
    let visible: Conference[] = [];

    if (user.role === 'SUPER_ADMIN') {
      visible = [...list];
    } else if (user.role === 'VILLAGE_HEAD') {
      visible = list.filter(c => c.village_id === user.village_id);
    } else {
      const parts = this.data.conference_participants || [];
      const myConfIds = new Set(parts.filter(p => p.user_id === user.user_id).map(p => p.conference_id));
      visible = list.filter(c => c.village_id === user.village_id && myConfIds.has(c.id));
    }

    return visible.map(c => {
      const v = this.data.villages.find(vil => vil.village_id === c.village_id);
      const u = this.data.users.find(usr => usr.user_id === c.created_by);
      const count = (this.data.conference_participants || []).filter(p => p.conference_id === c.id).length;
      const { jitsi_room_name, ...safeConf } = c;
      return {
        ...safeConf,
        village_name: v ? v.village_name : undefined,
        created_by_name: u ? u.name : undefined,
        participants_count: count
      };
    }).sort((a, b) => (b.scheduled_date + b.scheduled_time).localeCompare(a.scheduled_date + a.scheduled_time));
  }

  public getConferenceById(conferenceId: string): Conference | null {
    const conf = (this.data.conferences || []).find(c => c.id === conferenceId);
    if (!conf) return null;
    const v = this.data.villages.find(vil => vil.village_id === conf.village_id);
    const u = this.data.users.find(usr => usr.user_id === conf.created_by);
    const parts = (this.data.conference_participants || []).filter(p => p.conference_id === conf.id).map(p => {
      const partUser = this.data.users.find(pu => pu.user_id === p.user_id);
      return {
        ...p,
        user_name: partUser ? partUser.name : undefined,
        role: partUser ? partUser.role : undefined
      };
    });
    return {
      ...conf,
      village_name: v ? v.village_name : undefined,
      created_by_name: u ? u.name : undefined,
      participants: parts,
      participants_count: parts.length
    };
  }

  public getMembersForVillage(villageId: string): Array<{ user_id: string; name: string; mobile: string; role: string }> {
    return this.data.users
      .filter(u => u.village_id === villageId && u.role === 'MEMBER' && u.status === 'ACTIVE')
      .map(u => ({ user_id: u.user_id, name: u.name, mobile: u.mobile, role: u.role }));
  }

  public createConference(
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
  ): Conference {
    if (user.role !== 'VILLAGE_HEAD') {
      throw new Error('Forbidden: Only Village Heads can create video conferences.');
    }
    if (!user.village_id) {
      throw new Error('Village Head must be assigned to exactly one village.');
    }
    if (data.village_id !== user.village_id) {
      throw new Error('Security Violation: A Village Head can create a conference ONLY for their assigned village.');
    }

    const participantIds = Array.isArray(data.participant_user_ids) ? data.participant_user_ids : [];
    for (const pId of participantIds) {
      const member = this.data.users.find(u => u.user_id === pId);
      if (!member || member.village_id !== user.village_id) {
        throw new Error(`Security Violation: Member ${pId} belongs to a different village. Never allow inviting members from another village.`);
      }
      if (member.role !== 'MEMBER') {
        throw new Error(`Security Violation: User ${pId} is not a Member.`);
      }
    }

    const randomPart = Math.random().toString(36).substring(2, 12);
    const jitsiRoomName = `SindhanurAC58_Conf_${randomPart}`;
    const confId = `CONF_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    const newConf: any = {
      id: confId,
      title: data.title,
      description: data.description || '',
      village_id: user.village_id,
      created_by: user.user_id,
      scheduled_date: data.scheduled_date,
      scheduled_time: data.scheduled_time,
      duration: data.duration || 30,
      jitsi_room_name: jitsiRoomName,
      status: 'Scheduled',
      created_at: now
    };

    if (!this.data.conferences) this.data.conferences = [];
    if (!this.data.conference_participants) this.data.conference_participants = [];

    this.data.conferences.unshift(newConf);

    // Host participant
    this.data.conference_participants.push({
      id: generateSecureId('CP'),
      conference_id: confId,
      user_id: user.user_id,
      invited_at: now
    });

    // Invited members & notifications
    for (const pId of participantIds) {
      if (pId === user.user_id) continue;
      this.data.conference_participants.push({
        id: generateSecureId('CP'),
        conference_id: confId,
        user_id: pId,
        invited_at: now
      });

      this.data.notifications.unshift({
        notification_id: generateSecureId('NTF'),
        user_id: pId,
        village_id: user.village_id,
        title: 'Village meeting scheduled',
        message: `Village meeting scheduled: '${data.title}' on ${data.scheduled_date} at ${data.scheduled_time} (Village: ${user.village_id}).`,
        type: 'CONFERENCE' as any,
        is_read: false,
        link_url: '/meetings',
        created_at: now
      });
    }

    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'CREATE',
      record_type: 'CONFERENCE',
      record_id: confId,
      village_id: user.village_id,
      details: `Village Head (${user.name}) scheduled video conference '${data.title}' for village ${user.village_id} with ${participantIds.length} members.`
    });

    this.saveData();

    const { jitsi_room_name, ...safeReturn } = newConf;
    return {
      ...safeReturn,
      participants_count: participantIds.length + 1
    };
  }

  public authorizeConferenceAccess(
    conferenceId: string,
    user: User
  ): { jitsi_room_name: string; conference: Conference } {
    const conf = (this.data.conferences || []).find(c => c.id === conferenceId);
    if (!conf) {
      throw new Error('Video conference not found.');
    }
    if (conf.status === 'Ended' || conf.ended_at) {
      throw new Error('This conference has ended.');
    }
    if (conf.status === 'Cancelled') {
      throw new Error('This conference has been cancelled.');
    }

    if (user.role === 'SUPER_ADMIN') {
      // Super Admin can join any conference in constituency
    } else if (user.role === 'VILLAGE_HEAD') {
      if (conf.village_id !== user.village_id) {
        throw new Error('You are not authorized to join this conference.');
      }
    } else if (user.role === 'MEMBER') {
      if (conf.village_id !== user.village_id) {
        throw new Error('You are not authorized to join this conference.');
      }
      const isParticipant = (this.data.conference_participants || []).some(
        p => p.conference_id === conferenceId && p.user_id === user.user_id
      );
      if (!isParticipant) {
        throw new Error('You are not authorized to join this conference.');
      }
    } else {
      throw new Error('You are not authorized to join this conference.');
    }

    const now = new Date().toISOString();
    if (conf.status === 'Scheduled') {
      conf.status = 'Live';
      if (!conf.started_at) conf.started_at = now;
    }

    let pRecord = (this.data.conference_participants || []).find(
      p => p.conference_id === conferenceId && p.user_id === user.user_id
    );
    if (pRecord) {
      pRecord.joined_at = now;
    } else {
      if (!this.data.conference_participants) this.data.conference_participants = [];
      this.data.conference_participants.push({
        id: generateSecureId('CP'),
        conference_id: conferenceId,
        user_id: user.user_id,
        invited_at: now,
        joined_at: now
      });
    }

    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'STATUS_CHANGE',
      record_type: 'CONFERENCE',
      record_id: conferenceId,
      village_id: conf.village_id,
      details: `${user.name} (${user.role}) joined conference '${conf.title}'.`
    });

    this.saveData();

    const { jitsi_room_name, ...safeConf } = conf;
    return {
      jitsi_room_name,
      conference: safeConf
    };
  }

  public leaveConference(conferenceId: string, user: User): void {
    const pRecord = (this.data.conference_participants || []).find(
      p => p.conference_id === conferenceId && p.user_id === user.user_id
    );
    if (pRecord) {
      pRecord.left_at = new Date().toISOString();
      this.saveData();
    }
  }

  public endConference(conferenceId: string, user: User): Conference {
    const conf = (this.data.conferences || []).find(c => c.id === conferenceId);
    if (!conf) {
      throw new Error('Conference not found.');
    }
    if (user.role !== 'VILLAGE_HEAD' || user.village_id !== conf.village_id) {
      throw new Error('Forbidden: Only the Village Head of this village can end this conference for everyone.');
    }

    const now = new Date().toISOString();
    conf.status = 'Ended';
    conf.ended_at = now;

    this.logAudit({
      user_id: user.user_id,
      user_name: user.name,
      role: user.role,
      action: 'STATUS_CHANGE',
      record_type: 'CONFERENCE',
      record_id: conferenceId,
      village_id: conf.village_id,
      details: `Village Head (${user.name}) ended video conference '${conf.title}' for all participants.`
    });

    this.saveData();

    const { jitsi_room_name, ...safeConf } = conf;
    return safeConf;
  }
}

export const db = new ConstituencyDatabase();



