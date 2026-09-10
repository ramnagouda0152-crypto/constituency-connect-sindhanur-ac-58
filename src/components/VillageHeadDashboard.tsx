import React from 'react';
import {
  Users,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Footprints,
  Plus,
  ArrowRight,
  Shield,
  Activity,
  MapPin,
  Building,
  Video
} from 'lucide-react';
import { DashboardStats, Village, Issue, DevelopmentProject, VillageMeeting, FieldVisit } from '../types.ts';
import { Language, t } from '../translations.ts';

interface VillageHeadDashboardProps {
  stats: DashboardStats;
  village?: Village;
  issues: Issue[];
  projects: DevelopmentProject[];
  meetings: VillageMeeting[];
  fieldVisits: FieldVisit[];
  lang: Language;
  onNavigate: (view: string) => void;
  onNewIssue: () => void;
}

export const VillageHeadDashboard: React.FC<VillageHeadDashboardProps> = ({
  stats,
  village,
  issues,
  projects,
  meetings,
  fieldVisits,
  lang,
  onNavigate,
  onNewIssue
}) => {
  return (
    <div className="space-y-6">
      {/* Required Title and Hierarchy Header as per Section 7 */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm border border-emerald-800/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2 border border-emerald-400/30 uppercase tracking-wide">
              <Shield className="w-3.5 h-3.5" />
              {t('myVillage', lang)}
            </div>

            {/* Title: MY VILLAGE */}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {village?.village_name || 'My Village'}
            </h1>
            <p className="text-sm font-medium text-emerald-200 mt-0.5">
              {village?.kannada_name}
            </p>

            {/* Sub-header showing required hierarchy: Village, GP, Taluk, AC-58 Sindhanur */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Gram Panchayat:</span>
                <span className="font-semibold text-white">{stats.gp_details?.gp_name || village?.gp_id || 'GP'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Taluk:</span>
                <span className="font-semibold text-white">Sindhanur</span>
              </span>
              <span>•</span>
              <span className="bg-emerald-800/80 px-2 py-0.5 rounded text-[11px] font-bold text-white border border-emerald-600/50">
                AC-58 Sindhanur
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('meetings')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-sm"
            >
              <Video className="w-4 h-4" />
              Video Conference
            </button>
            <button
              onClick={onNewIssue}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-xl text-xs transition-colors border border-white/15"
            >
              <Plus className="w-4 h-4" />
              Report Issue
            </button>
            <button
              onClick={() => onNavigate('field-visits')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs transition-colors border border-white/15"
            >
              <Footprints className="w-4 h-4 text-emerald-300" />
              Log Visit
            </button>
          </div>
        </div>
      </div>

      {/* 8 Required Dashboard Cards for Village Head:
          - Team Members
          - Total Issues
          - New Issues
          - Pending Issues
          - Resolved Issues
          - Development Projects
          - Upcoming Meetings
          - Recent Field Visits
      */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Team Members */}
        <div 
          onClick={() => onNavigate('team')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('totalTeamMembers', lang)}</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total_team_members}</p>
          <span className="text-[11px] text-slate-500">In this village</span>
        </div>

        {/* Total Issues */}
        <div 
          onClick={() => onNavigate('issues')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('totalIssues', lang)}</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total_issues}</p>
          <span className="text-[11px] text-slate-500">All recorded</span>
        </div>

        {/* New Issues */}
        <div 
          onClick={() => onNavigate('issues')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('newIssues', lang)}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">{stats.new_issues}</p>
          <span className="text-[11px] text-slate-500">Requires verification</span>
        </div>

        {/* Pending Issues */}
        <div 
          onClick={() => onNavigate('issues')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('pendingIssues', lang)}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{stats.pending_issues}</p>
          <span className="text-[11px] text-slate-500">Under resolution</span>
        </div>

        {/* Resolved Issues */}
        <div 
          onClick={() => onNavigate('issues')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('resolvedIssues', lang)}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{stats.resolved_issues}</p>
          <span className="text-[11px] text-slate-500">Successfully closed</span>
        </div>

        {/* Development Projects */}
        <div 
          onClick={() => onNavigate('development')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('developmentProjects', lang)}</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total_projects}</p>
          <span className="text-[11px] text-slate-500">{stats.active_projects} active in village</span>
        </div>

        {/* Upcoming Meetings */}
        <div 
          onClick={() => onNavigate('meetings')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('upcomingMeetings', lang)}</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-2">{stats.upcoming_meetings}</p>
          <span className="text-[11px] text-slate-500">Gram Sabhe & ward</span>
        </div>

        {/* Recent Field Visits */}
        <div 
          onClick={() => onNavigate('field-visits')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('recentFieldVisits', lang)}</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Footprints className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.recent_field_visits}</p>
          <span className="text-[11px] text-slate-500">Inspections logged</span>
        </div>

      </div>

      {/* Recent Activity Section as required by Section 7 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Village Issues */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Current Civic Issues in {village?.village_name}</h3>
              <p className="text-xs text-slate-500">Directly impacting village residents</p>
            </div>
            <button
              onClick={() => onNavigate('issues')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Manage issues <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {issues.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No active issues recorded in your village.</p>
            ) : (
              issues.slice(0, 4).map(issue => (
                <div
                  key={issue.issue_id}
                  onClick={() => onNavigate('issues')}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/70 transition-all cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                        {issue.category}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        issue.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                        issue.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {issue.priority}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {issue.issue_id}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 truncate">{issue.title}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{issue.description}</p>
                  </div>

                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    issue.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                    issue.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {issue.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Village Projects & Next Meeting */}
        <div className="space-y-4">
          
          {/* Ongoing Development Works */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Development Progress</h3>
            <p className="text-xs text-slate-500 mb-3">Govt works in progress</p>

            <div className="space-y-3">
              {projects.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">No active projects</p>
              ) : (
                projects.slice(0, 2).map(p => (
                  <div key={p.project_id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate pr-2">{p.project_name}</span>
                      <span className="font-bold text-emerald-700">{p.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.progress_percentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">₹{(p.approved_cost / 100000).toFixed(1)} Lakhs • {p.department}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Next Scheduled Meeting */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Next Village Meeting</h3>
            {meetings.length > 0 ? (
              <div className="mt-2 bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1">
                <p className="font-semibold text-slate-900">{meetings[0].title}</p>
                <div className="flex items-center gap-2 text-slate-600 text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{meetings[0].date} at {meetings[0].time}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{meetings[0].location}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">No scheduled meetings</p>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
