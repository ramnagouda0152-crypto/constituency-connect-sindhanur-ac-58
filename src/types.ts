/**
 * Constituency Connect – Sindhanur AC-58
 * Core Data Models & TypeScript Interfaces
 */

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'VILLAGE_HEAD'
  | 'MEMBER';

export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

export interface User {
  user_id: string;
  name: string;
  name_kannada?: string;
  mobile: string;
  email?: string;
  voter_id?: string;
  dob?: string;
  gender?: string;
  address?: string;
  role: UserRole;
  village_id: string | null; // EXACTLY ONE village for VILLAGE_HEAD and MEMBER
  gp_id: string | null;
  taluk_id: string;
  constituency_id: string;
  status: UserStatus;
  profile_photo?: string;
  created_at: string;
  updated_at?: string;
}

export interface Constituency {
  constituency_id: string;
  name: string;
  name_kannada: string;
  code: string; // AC-58
  district: string;
  state: string;
  total_voters: number;
}

export interface Taluk {
  taluk_id: string;
  constituency_id: string;
  name: string;
  name_kannada: string;
  headquarters: string;
}

export interface GramPanchayat {
  gp_id: string;
  gp_name: string;
  kannada_name: string;
  taluk_id: string;
  constituency_id: string;
  status: 'ACTIVE' | 'INACTIVE';
  headquarters_village_id?: string;
  villages_count?: number;
}

export interface Village {
  village_id: string;
  village_name: string;
  kannada_name: string;
  gp_id: string;
  taluk_id: string;
  constituency_id: string;
  latitude: number;
  longitude: number;
  population?: number;
  households?: number;
  voter_count?: number;
  boundary_geojson?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Booth {
  booth_id: string;
  booth_number: number;
  polling_station_name: string;
  kannada_name?: string;
  village_id: string;
  gp_id: string;
  location: string;
  latitude: number;
  longitude: number;
  voters_count: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export type IssueCategory = 
  | 'Road'
  | 'Water'
  | 'Electricity'
  | 'Drainage'
  | 'Agriculture'
  | 'Education'
  | 'Health'
  | 'Transport'
  | 'Public Services'
  | 'Other';

export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IssueStatus = 
  | 'NEW'
  | 'VERIFIED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED';

export interface Issue {
  issue_id: string;
  village_id: string;
  gp_id: string;
  title: string;
  category: IssueCategory;
  description: string;
  priority: IssuePriority;
  status: IssueStatus;
  location: string;
  latitude?: number;
  longitude?: number;
  created_by: string; // user_id or citizen name
  created_by_name?: string;
  assigned_to?: string | null; // user_id
  assigned_to_name?: string | null;
  created_at: string;
  updated_at: string;
  photos: string[];
  documents: string[];
}

export interface IssueUpdate {
  update_id: string;
  issue_id: string;
  village_id: string;
  user_id: string;
  user_name: string;
  previous_status: IssueStatus;
  new_status: IssueStatus;
  remarks: string;
  timestamp: string;
}

export type ProjectStatus = 
  | 'PROPOSED'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED';

export interface DevelopmentProject {
  project_id: string;
  village_id: string;
  gp_id: string;
  project_name: string;
  project_name_kannada?: string;
  department: string;
  description: string;
  estimated_cost: number;
  approved_cost: number;
  start_date: string;
  expected_completion: string;
  progress_percentage: number;
  status: ProjectStatus;
  photos: string[];
  documents: string[];
  contractor_name?: string;
}

export interface ProjectUpdate {
  update_id: string;
  project_id: string;
  village_id: string;
  user_id: string;
  progress_percentage: number;
  remarks: string;
  photos: string[];
  timestamp: string;
}

export interface FieldVisit {
  visit_id: string;
  village_id: string;
  gp_id: string;
  user_id: string;
  user_name: string;
  date: string;
  time: string;
  location: string;
  purpose: string;
  notes: string;
  observations?: string;
  photos: string[];
  issues_identified: string[];
  follow_up_required: boolean;
  follow_up_needed?: boolean;
  latitude?: number;
  longitude?: number;
  gps_lat?: number;
  gps_lng?: number;
  created_at: string;
}

export type MeetingStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface VillageMeeting {
  meeting_id: string;
  village_id: string;
  gp_id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  agenda: string;
  participants: string[];
  attendees?: number | string[];
  decisions: string;
  follow_up_tasks: string[];
  documents: string[];
  status: MeetingStatus;
  created_by: string;
  created_at: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  task_id: string;
  village_id: string;
  gp_id: string;
  title: string;
  description: string;
  assigned_to: string; // user_id
  assigned_to_name?: string;
  linked_type?: 'ISSUE' | 'PROJECT' | 'MEETING' | 'GENERAL';
  linked_id?: string;
  priority: TaskPriority;
  due_date: string;
  status: TaskStatus;
  created_by: string;
  created_at: string;
}

export interface VillageDocument {
  file_id: string;
  village_id: string;
  uploaded_by: string;
  uploaded_by_name: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  category: 'PHOTO' | 'DOCUMENT' | 'REPORT' | 'MEETING_MINUTES';
  created_at: string;
}

export interface Notification {
  notification_id: string;
  user_id?: string | null; // specific user or all in village
  village_id?: string | null;
  title: string;
  message: string;
  type: 'ISSUE' | 'PROJECT' | 'MEETING' | 'TASK' | 'SYSTEM';
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  audit_id: string;
  user_id: string;
  user_name: string;
  role: UserRole;
  action: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'ASSIGNMENT' | 'FILE_UPLOAD' | 'PERMISSION_CHANGE';
  record_type: string;
  record_id: string;
  village_id?: string | null;
  details: string;
  ip_address?: string;
  timestamp: string;
}

export interface DashboardStats {
  total_villages: number;
  total_gps: number;
  total_booths: number;
  total_team_members: number;
  total_issues: number;
  new_issues: number;
  pending_issues: number;
  resolved_issues: number;
  total_projects: number;
  active_projects: number;
  upcoming_meetings: number;
  recent_field_visits: number;
  village_details?: Village;
  gp_details?: GramPanchayat;
}

export interface Announcement {
  announcement_id: string;
  village_id?: string | null; // null for constituency-wide (super admin), or specific village_id
  title: string;
  content: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export type VideoMeetingStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
export type VideoMeetingType = 'VILLAGE_MEETING';

export interface VideoParticipant {
  user_id: string;
  name: string;
  role: UserRole;
  joined_at: string;
  is_muted: boolean;
  can_speak: boolean;
  is_hand_raised?: boolean;
  is_video_enabled?: boolean;
}

export interface VideoMeeting {
  meeting_id: string;
  title: string;
  description: string;
  village_id: string;
  host_user_id: string;
  created_by: string;
  scheduled_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  status: VideoMeetingStatus;
  meeting_type: VideoMeetingType;
  allow_screen_share?: boolean;
  participants: VideoParticipant[];
  created_at: string;
  updated_at: string;
}

// Jitsi Video Conference Types
export type ConferenceStatus = 'Scheduled' | 'Live' | 'Ended' | 'Cancelled';

export interface ConferenceParticipant {
  id?: number | string;
  conference_id: string;
  user_id: string;
  user_name?: string;
  role?: UserRole;
  invited_at: string;
  joined_at?: string | null;
  left_at?: string | null;
}

export interface Conference {
  id: string;
  title: string;
  description?: string;
  village_id: string;
  village_name?: string;
  created_by: string;
  created_by_name?: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number; // minutes
  jitsi_room_name?: string; // Kept secure on server; only provided on authorized access
  status: ConferenceStatus;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  participants_count?: number;
  participants?: ConferenceParticipant[];
}

