import {
  User,
  DashboardStats,
  Village,
  GramPanchayat,
  Booth,
  Issue,
  DevelopmentProject,
  FieldVisit,
  VillageMeeting,
  Task,
  VillageDocument,
  Notification,
  AuditLog,
  VideoMeeting,
  VideoParticipant,
  Announcement,
  Conference,
  ConferenceParticipant
} from '../types.ts';

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
const API_BASE_URL = (
  (metaEnv && (metaEnv.VITE_API_BASE_URL || metaEnv.VITE_API_URL)) ||
  ''
).replace(/\/+$/, '');

export interface PublicVillage {
  id: string;
  name: string;
  gramPanchayat?: string;
  gram_panchayat?: string;
  taluk?: string;
  district?: string;
  assemblyConstituency?: string;
  village_id: string;
  village_name: string;
  kannada_name: string;
  gp_id: string;
  population?: number;
  households?: number;
  voter_count?: number;
}

class ApiClient {
  private token: string | null = null;
  private currentUserId: string | null = null;

  constructor() {
    // Read from localStorage if available
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('cc_active_user_id');
      if (savedUser) {
        this.currentUserId = savedUser;
      }
      const savedToken = localStorage.getItem('cc_auth_token');
      if (savedToken) {
        this.token = savedToken;
      }
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('cc_auth_token', token);
      } else {
        localStorage.removeItem('cc_auth_token');
      }
    }
  }

  public setCurrentUserId(userId: string | null) {
    this.currentUserId = userId;
    if (typeof window !== 'undefined') {
      if (userId) {
        localStorage.setItem('cc_active_user_id', userId);
      } else {
        localStorage.removeItem('cc_active_user_id');
      }
    }
  }

  public async logout(): Promise<void> {
    try {
      if (this.token) {
        await this.request('/api/auth/logout', { method: 'POST' });
      }
    } catch {
      // Ignore network errors during logout cleanup
    } finally {
      this.setToken(null);
      this.setCurrentUserId(null);
    }
  }

  public async sendResetOtp(data: {
    mobile: string;
    voter_id: string;
  }): Promise<{ success: boolean; message: string; expiresInSeconds?: number }> {
    return this.request('/api/auth/send-reset-otp', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async resetPassword(data: {
    mobile: string;
    voter_id: string;
    otp: string;
    new_password: string;
    confirm_password: string;
    profile_photo?: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${API_BASE_URL}${path}`;

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: response.statusText }));
      const error: any = new Error(errorBody.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.code = errorBody.code;
      error.data = errorBody;
      throw error;
    }

    return response.json();
  }

  // Auth & Public Directories
  public async getPublicVillages(): Promise<PublicVillage[]> {
    return this.request('/api/public/villages');
  }

  public async getPublicGramPanchayats(): Promise<GramPanchayat[]> {
    return this.request('/api/public/gram-panchayats');
  }

  public async register(data: {
    name: string;
    mobile: string;
    voter_id: string;
    dob?: string;
    gender?: string;
    address?: string;
    village_id: string;
    password: string;
    confirm_password: string;
    profile_photo?: string;
  }): Promise<{ success: boolean; message: string; user: User }> {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async loginWithCredentials(params: {
    mobile?: string;
    email?: string;
    userId?: string;
    password?: string;
  }): Promise<{ token: string; user: User; villageDetails?: Village; gpDetails?: GramPanchayat }> {
    const res = await this.request<{ token: string; user: User; villageDetails?: Village; gpDetails?: GramPanchayat }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(params)
    });
    this.setToken(res.token);
    this.setCurrentUserId(res.user.user_id);
    return res;
  }

  public async getMe(): Promise<{ user: User; villageDetails?: Village; gpDetails?: GramPanchayat; allowedVillageIds?: string[] | null }> {
    return this.request('/api/auth/me');
  }

  public async login(userId: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    this.setToken(res.token);
    this.setCurrentUserId(res.user.user_id);
    return res;
  }

  // Super Admin User Management
  public async getAdminUsers(filters?: {
    status?: string;
    role?: string;
    village_id?: string;
    gp_id?: string;
    search?: string;
  }): Promise<User[]> {
    const query = new URLSearchParams();
    if (filters?.status) query.append('status', filters.status);
    if (filters?.role) query.append('role', filters.role);
    if (filters?.village_id) query.append('village_id', filters.village_id);
    if (filters?.gp_id) query.append('gp_id', filters.gp_id);
    if (filters?.search) query.append('search', filters.search);
    return this.request(`/api/admin/users?${query.toString()}`);
  }

  public async approveUser(userId: string): Promise<{ success: boolean; message: string; user: User }> {
    return this.request(`/api/admin/users/${encodeURIComponent(userId)}/approve`, {
      method: 'POST'
    });
  }

  public async rejectUser(userId: string): Promise<{ success: boolean; message: string; user: User }> {
    return this.request(`/api/admin/users/${encodeURIComponent(userId)}/reject`, {
      method: 'POST'
    });
  }

  public async promoteToVillageHead(userId: string, village_id: string): Promise<{ success: boolean; message: string; user: User }> {
    return this.request(`/api/admin/users/${encodeURIComponent(userId)}/promote-village-head`, {
      method: 'POST',
      body: JSON.stringify({ village_id })
    });
  }

  public async demoteToMember(userId: string): Promise<{ success: boolean; message: string; user: User }> {
    return this.request(`/api/admin/users/${encodeURIComponent(userId)}/demote-to-member`, {
      method: 'POST'
    });
  }

  public async reassignVillageHead(userId: string, village_id: string): Promise<{ success: boolean; message: string; user: User }> {
    return this.request(`/api/admin/users/${encodeURIComponent(userId)}/reassign-village`, {
      method: 'POST',
      body: JSON.stringify({ village_id })
    });
  }

  public async setUserStatus(userId: string, status: string): Promise<{ success: boolean; message: string; user: User }> {
    return this.request(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  }

  public async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });
  }

  public async updateUserByAdmin(userId: string, updates: Partial<User>): Promise<{ success: boolean; message: string; user: User }> {
    return this.request(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // Dashboard Stats
  public async getStats(): Promise<DashboardStats> {
    return this.request('/api/dashboard/stats');
  }

  // Villages
  public async getVillages(): Promise<Village[]> {
    try {
      return await this.request('/api/villages');
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        // Fallback to public villages directory if unauthenticated
        const publicList = await this.getPublicVillages().catch(() => []);
        return publicList as any as Village[];
      }
      throw err;
    }
  }

  public async getVillageProfile(villageId: string): Promise<{
    village: Village;
    gp?: GramPanchayat;
    booths: Booth[];
    team: User[];
    issues: Issue[];
    projects: DevelopmentProject[];
    meetings: VillageMeeting[];
    fieldVisits: FieldVisit[];
    documents: VillageDocument[];
  }> {
    return this.request(`/api/villages/${encodeURIComponent(villageId)}`);
  }

  public async createVillage(data: Partial<Village>): Promise<Village> {
    return this.request('/api/villages', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async updateVillage(villageId: string, data: Partial<Village>): Promise<Village> {
    return this.request(`/api/villages/${encodeURIComponent(villageId)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Gram Panchayats
  public async getGramPanchayats(): Promise<GramPanchayat[]> {
    return this.request('/api/gram-panchayats');
  }

  public async getGramPanchayat(gpId: string): Promise<{ gp: GramPanchayat; villages: Village[] }> {
    return this.request(`/api/gram-panchayats/${encodeURIComponent(gpId)}`);
  }

  // Booths
  public async getBooths(): Promise<Booth[]> {
    return this.request('/api/booths');
  }

  public async createBooth(data: Partial<Booth>): Promise<Booth> {
    return this.request('/api/booths', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Team
  public async getTeam(): Promise<User[]> {
    return this.request('/api/team');
  }

  public async createTeamMember(data: Partial<User>): Promise<User> {
    return this.request('/api/team', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async updateUser(userId: string, data: Partial<User>): Promise<User> {
    return this.request(`/api/team/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Issues
  public async getIssues(params?: { category?: string; priority?: string; status?: string; village_id?: string }): Promise<Issue[]> {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.status) query.set('status', params.status);
    if (params?.village_id) query.set('village_id', params.village_id);
    const qs = query.toString();
    return this.request(`/api/issues${qs ? `?${qs}` : ''}`);
  }

  public async getIssue(issueId: string): Promise<{ issue: Issue; updates: any[] }> {
    return this.request(`/api/issues/${encodeURIComponent(issueId)}`);
  }

  public async createIssue(data: Partial<Issue>): Promise<Issue> {
    return this.request('/api/issues', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async updateIssueStatus(issueId: string, status: Issue['status'], remarks: string, assigned_to?: string): Promise<Issue> {
    return this.request(`/api/issues/${encodeURIComponent(issueId)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, remarks, assigned_to })
    });
  }

  // Projects
  public async getProjects(): Promise<DevelopmentProject[]> {
    return this.request('/api/projects');
  }

  public async createProject(data: Partial<DevelopmentProject>): Promise<DevelopmentProject> {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async updateProjectProgress(projectId: string, progress_percentage: number, remarks: string): Promise<DevelopmentProject> {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ progress_percentage, remarks })
    });
  }

  // Field Visits
  public async getFieldVisits(): Promise<FieldVisit[]> {
    return this.request('/api/field-visits');
  }

  public async createFieldVisit(data: Partial<FieldVisit>): Promise<FieldVisit> {
    return this.request('/api/field-visits', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Meetings
  public async getMeetings(): Promise<VillageMeeting[]> {
    return this.request('/api/meetings');
  }

  public async createMeeting(data: Partial<VillageMeeting>): Promise<VillageMeeting> {
    return this.request('/api/meetings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Tasks
  public async getTasks(): Promise<Task[]> {
    return this.request('/api/tasks');
  }

  public async createTask(data: Partial<Task>): Promise<Task> {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async updateTaskStatus(taskId: string, status: Task['status']): Promise<Task> {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  // Documents
  public async getDocuments(): Promise<VillageDocument[]> {
    return this.request('/api/documents');
  }

  public async createDocument(data: Partial<VillageDocument>): Promise<VillageDocument> {
    return this.request('/api/documents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Global Search
  public async search(q: string): Promise<{ query: string; results: any }> {
    return this.request(`/api/search?q=${encodeURIComponent(q)}`);
  }

  // Map Data
  public async getMapData(): Promise<any> {
    return this.request('/api/map');
  }

  // Notifications
  public async getNotifications(): Promise<Notification[]> {
    return this.request('/api/notifications');
  }

  public async markNotificationAsRead(notifId: string): Promise<{ success: boolean }> {
    return this.request(`/api/notifications/${encodeURIComponent(notifId)}/read`, {
      method: 'PUT'
    });
  }

  // Audit Logs (Admin only)
  public async getAuditLogs(villageId?: string): Promise<AuditLog[]> {
    const qs = villageId ? `?village_id=${encodeURIComponent(villageId)}` : '';
    return this.request(`/api/audit-logs${qs}`);
  }

  // Reports
  public async getReportSummary(): Promise<any> {
    return this.request('/api/reports/summary');
  }

  // Video Conferences (Restricted: only Village Head can create)
  public async getVideoMeetings(): Promise<VideoMeeting[]> {
    return this.request('/api/video-meetings');
  }

  public async getVideoMeetingById(meetingId: string): Promise<VideoMeeting> {
    return this.request(`/api/video-meetings/${encodeURIComponent(meetingId)}`);
  }

  public async createVideoMeeting(data: {
    title: string;
    description?: string;
    scheduled_at?: string;
    meeting_type?: string;
    allow_screen_share?: boolean;
    start_now?: boolean;
  }): Promise<VideoMeeting> {
    return this.request('/api/video-meetings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async joinVideoMeeting(meetingId: string): Promise<VideoMeeting> {
    return this.request(`/api/video-meetings/${encodeURIComponent(meetingId)}/join`, {
      method: 'POST'
    });
  }

  public async leaveVideoMeeting(meetingId: string): Promise<VideoMeeting> {
    return this.request(`/api/video-meetings/${encodeURIComponent(meetingId)}/leave`, {
      method: 'POST'
    });
  }

  public async updateVideoMeetingStatus(
    meetingId: string,
    status: VideoMeeting['status']
  ): Promise<VideoMeeting> {
    return this.request(`/api/video-meetings/${encodeURIComponent(meetingId)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  public async updateParticipantState(
    meetingId: string,
    participantUserId: string,
    updates: Partial<VideoParticipant>
  ): Promise<VideoMeeting> {
    return this.request(
      `/api/video-meetings/${encodeURIComponent(meetingId)}/participants/${encodeURIComponent(participantUserId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      }
    );
  }

  // --- Jitsi Video Conferences (Conferences & Participants) ---
  public async getConferences(): Promise<Conference[]> {
    return this.request('/api/conferences');
  }

  public async getConferenceById(id: string): Promise<Conference> {
    return this.request(`/api/conferences/${encodeURIComponent(id)}`);
  }

  public async getConferenceVillageMembers(): Promise<Array<{ user_id: string; name: string; mobile: string; role: string }>> {
    return this.request('/api/conferences/village-members');
  }

  public async createConference(data: {
    title: string;
    description?: string;
    scheduled_date: string;
    scheduled_time: string;
    duration: number;
    participant_user_ids: string[];
  }): Promise<Conference> {
    return this.request('/api/conferences', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public async joinConference(id: string): Promise<{
    success: boolean;
    jitsi_room_name: string;
    conference: Conference;
    user: { user_id: string; name: string; role: string };
  }> {
    return this.request(`/api/conferences/${encodeURIComponent(id)}/join`, {
      method: 'POST'
    });
  }

  public async leaveConference(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/conferences/${encodeURIComponent(id)}/leave`, {
      method: 'POST'
    });
  }

  public async endConference(id: string): Promise<{ success: boolean; conference: Conference }> {
    return this.request(`/api/conferences/${encodeURIComponent(id)}/end`, {
      method: 'POST'
    });
  }

  // Announcements
  public async getAnnouncements(): Promise<Announcement[]> {
    return this.request('/api/announcements');
  }

  public async createAnnouncement(data: Partial<Announcement>): Promise<Announcement> {
    return this.request('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Automated Security Test Suite
  public async runSecurityTests(): Promise<any> {
    return this.request('/api/security-test/run', {
      method: 'POST'
    });
  }
}

export const api = new ApiClient();
