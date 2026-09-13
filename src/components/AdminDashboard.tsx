import React from 'react';
import {
  Home,
  Building2,
  Vote,
  Users,
  AlertCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Plus,
  ArrowRight,
  ShieldCheck,
  Activity
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { DashboardStats, Village, Issue, DevelopmentProject } from '../types.ts';
import { Language, t } from '../translations.ts';

interface AdminDashboardProps {
  stats: DashboardStats;
  villages: Village[];
  issues: Issue[];
  projects: DevelopmentProject[];
  lang: Language;
  onNavigate: (view: string) => void;
  onOpenSecurityTests: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  villages,
  issues,
  projects,
  lang,
  onNavigate,
  onOpenSecurityTests
}) => {
  // Category breakdown for chart
  const categoryCounts: Record<string, number> = {};
  issues.forEach(i => {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
  });
  const categoryChartData = Object.keys(categoryCounts).map(cat => ({
    name: cat,
    count: categoryCounts[cat]
  }));

  // Status breakdown for donut
  const statusCounts = [
    { name: 'New', value: stats.new_issues, color: '#3b82f6' },
    { name: 'Pending', value: stats.pending_issues - stats.new_issues, color: '#f59e0b' },
    { name: 'Resolved', value: stats.resolved_issues, color: '#10b981' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            CONSTITUENCY ADMINISTRATION PORTAL
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Sindhanur AC-58 Civic Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Real-time governance dashboard monitoring Gram Panchayats, village issues, polling booths, and public works.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSecurityTests}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            Verify RBAC Isolation
          </button>
          <button
            onClick={() => onNavigate('map')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-1.5"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            Constituency Map
          </button>
        </div>
      </div>

      {/* 8 Metric Cards specified in Section 8 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Villages */}
        <div
          onClick={() => onNavigate('villages')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('totalVillages', lang)}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Home className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total_villages}</p>
          <span className="text-[11px] text-slate-500">Across 5 Gram Panchayats</span>
        </div>

        {/* Total GPs */}
        <div
          onClick={() => onNavigate('gram-panchayats')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('totalGPs', lang)}</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total_gps}</p>
          <span className="text-[11px] text-slate-500">Sindhanur Taluk</span>
        </div>

        {/* Total Booths */}
        <div
          onClick={() => onNavigate('booths')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('totalBooths', lang)}</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Vote className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total_booths}</p>
          <span className="text-[11px] text-slate-500">Polling stations mapped</span>
        </div>

        {/* Total Team Members */}
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
          <span className="text-[11px] text-slate-500">Heads & field workers</span>
        </div>

        {/* Total Issues */}
        <div
          onClick={() => onNavigate('issues')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('totalIssues', lang)}</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total_issues}</p>
          <span className="text-[11px] text-slate-500">{stats.new_issues} unverified / new</span>
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
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.pending_issues}</p>
          <span className="text-[11px] text-amber-600 font-medium">In workflow</span>
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
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.resolved_issues}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Resolved / Closed</span>
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
          <span className="text-[11px] text-slate-500">{stats.active_projects} active executions</span>
        </div>
      </div>

      {/* Analytics Grid: Issues by Category + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Issues by Category Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Civic Issues by Department Category</h3>
              <p className="text-xs text-slate-500">Distribution across Sindhanur AC-58</p>
            </div>
            <button
              onClick={() => onNavigate('issues')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
            >
              View all issues <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issue Status Breakdown Donut */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Resolution Progress</h3>
            <p className="text-xs text-slate-500">Issue lifecycle resolution rate</p>

            <div className="h-44 w-full mt-2 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusCounts}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
            {statusCounts.map(s => (
              <div key={s.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
                <span className="font-bold text-slate-900">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Village Overview Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Constituency Villages Directory</h3>
            <p className="text-xs text-slate-500">Live summary of constituent revenue villages and assignments</p>
          </div>
          <button
            onClick={() => onNavigate('villages')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            Manage Villages <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>

                <th className="py-3 px-4">Village Name</th>
                <th className="py-3 px-4">Gram Panchayat</th>
                <th className="py-3 px-4">Voters</th>
                <th className="py-3 px-4">Active Issues</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {villages.map(v => {
                const villageIssues = issues.filter(i => i.village_id === v.village_id && i.status !== 'RESOLVED' && i.status !== 'CLOSED');
                return (
                  <tr key={v.village_id} className="hover:bg-slate-50/80 transition-colors">

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{v.village_name}</div>
                      <div className="text-[11px] text-slate-400">{v.kannada_name}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{v.gp_id}</td>
                    <td className="py-3 px-4">{v.voter_count?.toLocaleString() || '—'}</td>
                    <td className="py-3 px-4">
                      {villageIssues.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          {villageIssues.length} pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          Clean
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {v.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigate(`village-profile:${v.village_id}`)}
                        className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs"
                      >
                        Profile →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
