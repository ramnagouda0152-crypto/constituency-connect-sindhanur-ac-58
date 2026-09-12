-- =============================================================
-- CONSTITUENCY CONNECT: SINDHANUR AC-58
-- PostgreSQL Production Schema
-- Compatible with Supabase, Neon, and Vercel Postgres
-- =============================================================

-- 1. Constituencies Table
CREATE TABLE IF NOT EXISTS constituencies (
  constituency_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_kannada VARCHAR(255),
  district VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  total_villages INTEGER DEFAULT 124,
  total_gps INTEGER DEFAULT 33
);

-- 2. Taluks Table
CREATE TABLE IF NOT EXISTS taluks (
  taluk_id VARCHAR(50) PRIMARY KEY,
  constituency_id VARCHAR(50) REFERENCES constituencies(constituency_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  name_kannada VARCHAR(255)
);

-- 3. Gram Panchayats Table
CREATE TABLE IF NOT EXISTS gram_panchayats (
  gp_id VARCHAR(50) PRIMARY KEY,
  taluk_id VARCHAR(50) REFERENCES taluks(taluk_id) ON DELETE CASCADE,
  constituency_id VARCHAR(50) REFERENCES constituencies(constituency_id) ON DELETE CASCADE,
  gp_name VARCHAR(255) NOT NULL,
  kannada_name VARCHAR(255),
  headquarters_village_id VARCHAR(50),
  villages_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- 4. Villages Table (124 official Sindhanur AC-58 villages)
CREATE TABLE IF NOT EXISTS villages (
  village_id VARCHAR(50) PRIMARY KEY,
  village_name VARCHAR(255) NOT NULL,
  kannada_name VARCHAR(255),
  gp_id VARCHAR(50) REFERENCES gram_panchayats(gp_id) ON DELETE SET NULL,
  taluk_id VARCHAR(50) REFERENCES taluks(taluk_id) ON DELETE SET NULL,
  constituency_id VARCHAR(50) REFERENCES constituencies(constituency_id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  population INTEGER DEFAULT 0,
  households INTEGER DEFAULT 0,
  voter_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- 5. Users Table (SUPER_ADMIN, VILLAGE_HEAD, MEMBER)
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_kannada VARCHAR(255),
  mobile VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  voter_id VARCHAR(50) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'VILLAGE_HEAD', 'MEMBER')),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED', 'INACTIVE')),
  village_id VARCHAR(50) REFERENCES villages(village_id) ON DELETE SET NULL,
  gp_id VARCHAR(50) REFERENCES gram_panchayats(gp_id) ON DELETE SET NULL,
  taluk_id VARCHAR(50) REFERENCES taluks(taluk_id) ON DELETE SET NULL,
  constituency_id VARCHAR(50) REFERENCES constituencies(constituency_id) ON DELETE SET NULL,
  password_hash TEXT,
  password_salt TEXT,
  dob VARCHAR(50),
  gender VARCHAR(20),
  address TEXT,
  profile_photo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_village_head_assignment CHECK (role != 'VILLAGE_HEAD' OR (village_id IS NOT NULL))
);

-- Critical concurrency index: Exactly one ACTIVE Village Head per village
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_village_head ON users (village_id)
WHERE role = 'VILLAGE_HEAD' AND status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_users_mobile ON users (mobile);
CREATE INDEX IF NOT EXISTS idx_users_voter_id ON users (voter_id);
CREATE INDEX IF NOT EXISTS idx_users_village_id ON users (village_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- 6. Sessions Table (Persistent serverless session store)
CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

-- 7. Polling Booths Table
CREATE TABLE IF NOT EXISTS booths (
  booth_id VARCHAR(100) PRIMARY KEY,
  booth_number INTEGER NOT NULL,
  polling_station_name VARCHAR(255) NOT NULL,
  kannada_name VARCHAR(255),
  village_id VARCHAR(50) REFERENCES villages(village_id) ON DELETE CASCADE,
  gp_id VARCHAR(50),
  location VARCHAR(255),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  voters_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'ACTIVE'
);
CREATE INDEX IF NOT EXISTS idx_booths_village_id ON booths (village_id);

-- 8. Issues Table
CREATE TABLE IF NOT EXISTS issues (
  issue_id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  priority VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  village_id VARCHAR(50) NOT NULL REFERENCES villages(village_id) ON DELETE CASCADE,
  gp_id VARCHAR(50),
  location VARCHAR(255),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_by VARCHAR(100) NOT NULL,
  created_by_name VARCHAR(255),
  assigned_to VARCHAR(100) REFERENCES users(user_id) ON DELETE SET NULL,
  assigned_to_name VARCHAR(255),
  photos JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_issues_village_id ON issues (village_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues (status);

-- 9. Issue Updates Table
CREATE TABLE IF NOT EXISTS issue_updates (
  update_id VARCHAR(100) PRIMARY KEY,
  issue_id VARCHAR(100) NOT NULL REFERENCES issues(issue_id) ON DELETE CASCADE,
  village_id VARCHAR(50),
  user_id VARCHAR(100) REFERENCES users(user_id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  remarks TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_issue_updates_issue_id ON issue_updates (issue_id);

-- 10. Development Projects Table
CREATE TABLE IF NOT EXISTS development_projects (
  project_id VARCHAR(100) PRIMARY KEY,
  project_name VARCHAR(255) NOT NULL,
  project_name_kannada VARCHAR(255),
  department VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  estimated_cost NUMERIC(15, 2) DEFAULT 0,
  approved_cost NUMERIC(15, 2) DEFAULT 0,
  status VARCHAR(50) NOT NULL,
  village_id VARCHAR(50) NOT NULL REFERENCES villages(village_id) ON DELETE CASCADE,
  gp_id VARCHAR(50),
  start_date VARCHAR(50),
  expected_completion VARCHAR(50),
  progress_percentage INTEGER DEFAULT 0,
  contractor_name VARCHAR(255),
  photos JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_projects_village_id ON development_projects (village_id);

-- 11. Project Updates Table
CREATE TABLE IF NOT EXISTS project_updates (
  update_id VARCHAR(100) PRIMARY KEY,
  project_id VARCHAR(100) NOT NULL REFERENCES development_projects(project_id) ON DELETE CASCADE,
  village_id VARCHAR(50),
  user_id VARCHAR(100) REFERENCES users(user_id) ON DELETE SET NULL,
  progress_percentage INTEGER NOT NULL,
  remarks TEXT NOT NULL,
  photos JSONB DEFAULT '[]'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON project_updates (project_id);

-- 12. Field Visits Table
CREATE TABLE IF NOT EXISTS field_visits (
  visit_id VARCHAR(100) PRIMARY KEY,
  village_id VARCHAR(50) NOT NULL REFERENCES villages(village_id) ON DELETE CASCADE,
  gp_id VARCHAR(50),
  user_id VARCHAR(100) REFERENCES users(user_id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  date VARCHAR(50) NOT NULL,
  time VARCHAR(50),
  location VARCHAR(255) NOT NULL,
  purpose TEXT NOT NULL,
  notes TEXT NOT NULL,
  observations TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  issues_identified JSONB DEFAULT '[]'::jsonb,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_needed BOOLEAN DEFAULT FALSE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_field_visits_village_id ON field_visits (village_id);

-- 13. Meetings Table
CREATE TABLE IF NOT EXISTS meetings (
  meeting_id VARCHAR(100) PRIMARY KEY,
  village_id VARCHAR(50) NOT NULL REFERENCES villages(village_id) ON DELETE CASCADE,
  gp_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  date VARCHAR(50) NOT NULL,
  time VARCHAR(50),
  location VARCHAR(255) NOT NULL,
  agenda TEXT NOT NULL,
  participants JSONB DEFAULT '[]'::jsonb,
  attendees INTEGER DEFAULT 0,
  decisions TEXT,
  follow_up_tasks JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meetings_village_id ON meetings (village_id);

-- 14. Video Meetings Table
CREATE TABLE IF NOT EXISTS video_meetings (
  meeting_id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  village_id VARCHAR(50) NOT NULL REFERENCES villages(village_id) ON DELETE CASCADE,
  host_user_id VARCHAR(100) REFERENCES users(user_id) ON DELETE CASCADE,
  created_by VARCHAR(100) NOT NULL,
  scheduled_at VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL,
  meeting_type VARCHAR(50) DEFAULT 'VILLAGE_MEETING',
  allow_screen_share BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_meetings_village_id ON video_meetings (village_id);

-- 15. Video Participants Table
CREATE TABLE IF NOT EXISTS video_participants (
  id SERIAL PRIMARY KEY,
  meeting_id VARCHAR(100) NOT NULL REFERENCES video_meetings(meeting_id) ON DELETE CASCADE,
  user_id VARCHAR(100) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  is_muted BOOLEAN DEFAULT FALSE,
  can_speak BOOLEAN DEFAULT TRUE,
  is_hand_raised BOOLEAN DEFAULT FALSE,
  is_video_enabled BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_meeting_participant UNIQUE (meeting_id, user_id)
);

-- 15b. Jitsi Video Conferences Table (Conferences)
CREATE TABLE IF NOT EXISTS conferences (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  village_id VARCHAR(50) NOT NULL REFERENCES villages(village_id) ON DELETE CASCADE,
  created_by VARCHAR(100) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  scheduled_date VARCHAR(50) NOT NULL,
  scheduled_time VARCHAR(50) NOT NULL,
  duration INTEGER NOT NULL DEFAULT 30,
  jitsi_room_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_conferences_village_id ON conferences (village_id);
CREATE INDEX IF NOT EXISTS idx_conferences_status ON conferences (status);

-- 15c. Conference Participants Table
CREATE TABLE IF NOT EXISTS conference_participants (
  id SERIAL PRIMARY KEY,
  conference_id VARCHAR(100) NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
  user_id VARCHAR(100) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  CONSTRAINT unique_conf_participant UNIQUE (conference_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_conf_participants_conf ON conference_participants (conference_id);
CREATE INDEX IF NOT EXISTS idx_conf_participants_user ON conference_participants (user_id);

-- 16. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  task_id VARCHAR(100) PRIMARY KEY,
  village_id VARCHAR(50) NOT NULL REFERENCES villages(village_id) ON DELETE CASCADE,
  gp_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  assigned_to VARCHAR(100) REFERENCES users(user_id) ON DELETE SET NULL,
  assigned_to_name VARCHAR(255),
  linked_type VARCHAR(50),
  linked_id VARCHAR(100),
  priority VARCHAR(50) NOT NULL,
  due_date VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_by VARCHAR(100) REFERENCES users(user_id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_village_id ON tasks (village_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks (assigned_to);

-- 17. Documents Table
CREATE TABLE IF NOT EXISTS documents (
  file_id VARCHAR(100) PRIMARY KEY,
  village_id VARCHAR(50) NOT NULL REFERENCES villages(village_id) ON DELETE CASCADE,
  uploaded_by VARCHAR(100) REFERENCES users(user_id) ON DELETE SET NULL,
  uploaded_by_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER DEFAULT 0,
  file_url TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documents_village_id ON documents (village_id);

-- 18. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  announcement_id VARCHAR(100) PRIMARY KEY,
  village_id VARCHAR(50) REFERENCES villages(village_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL,
  created_by VARCHAR(100) REFERENCES users(user_id) ON DELETE SET NULL,
  created_by_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_announcements_village_id ON announcements (village_id);

-- 19. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  notification_id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) REFERENCES users(user_id) ON DELETE CASCADE,
  village_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  link_url VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);

-- 20. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  record_type VARCHAR(100) NOT NULL,
  record_id VARCHAR(100),
  village_id VARCHAR(50),
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_village_id ON audit_logs (village_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);
