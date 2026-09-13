import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, CheckCircle2, TrendingUp, AlertCircle, Home, Users } from 'lucide-react';
import { User, Village, Issue, DevelopmentProject } from '../types.ts';
import { api } from '../services/api.ts';
import { getVillageName } from '../utils/villageName';
import { Language, t } from '../translations.ts';

interface ReportsViewProps {
  currentUser: User;
  villages: Village[];
  issues: Issue[];
  projects: DevelopmentProject[];
  lang: Language;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentUser,
  villages,
  issues,
  projects,
  lang
}) => {
  const [reportType, setReportType] = useState<'constituency' | 'village' | 'issues' | 'projects'>('constituency');
  const [selectedVillageId, setSelectedVillageId] = useState(currentUser.village_id || 'V_GOR01');
  const [summaryData, setSummaryData] = useState<any | null>(null);

  const isVillageHead = currentUser.role === 'VILLAGE_HEAD';

  useEffect(() => {
    loadReportSummary();
  }, [currentUser]);

  const loadReportSummary = async () => {
    try {
      const data = await api.getReportSummary();
      setSummaryData(data);
    } catch (err: any) {
      console.error('Failed to load summary:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (reportType === 'issues') {
      csvContent += 'Issue ID,Title,Category,Priority,Status,Village ID,Reported By,Created At\n';
      issues.forEach(i => {
        csvContent += `"${i.issue_id}","${i.title.replace(/"/g, '""')}","${i.category}","${i.priority}","${i.status}","${i.village_id}","${i.reported_by}","${i.created_at}"\n`;
      });
    } else if (reportType === 'projects') {
      csvContent += 'Project ID,Name,Department,Budget (INR),Progress (%),Village ID,Status\n';
      projects.forEach(p => {
        csvContent += `"${p.project_id}","${p.project_name.replace(/"/g, '""')}","${p.department}","${p.approved_cost}","${p.progress_percentage}%","${p.village_id}","${p.status}"\n`;
      });
    } else {
      csvContent += 'Village ID,Village Name,Gram Panchayat,Voters,Households,Status\n';
      villages.forEach(v => {
        csvContent += `"${v.village_id}","${v.village_name}","${v.gp_id}","${v.voter_count || 0}","${v.households || 0}","${v.status}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sindhanur_ac58_${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const targetVillage = villages.find(v => v.village_id === (isVillageHead ? currentUser.village_id : selectedVillageId));
  const villageIssues = issues.filter(i => i.village_id === (isVillageHead ? currentUser.village_id : selectedVillageId));
  const villageProjects = projects.filter(p => p.village_id === (isVillageHead ? currentUser.village_id : selectedVillageId));

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('reports', lang)}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Official constituency and village governance documentation and analytical dossiers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Select Report View */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {!isVillageHead && (
          <button
            onClick={() => setReportType('constituency')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              reportType === 'constituency' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Constituency Overview Report
          </button>
        )}
        <button
          onClick={() => setReportType('village')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            reportType === 'village' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Village Governance Dossier
        </button>
        <button
          onClick={() => setReportType('issues')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            reportType === 'issues' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Grievances & Issue Lifecycle Log
        </button>
        <button
          onClick={() => setReportType('projects')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            reportType === 'projects' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Public Works & Expenditure Dossier
        </button>
      </div>

      {/* Printable Report Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs print:border-none print:shadow-none print:p-0 space-y-6">

        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">
            Government of Karnataka • Legislative Assembly AC-58
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
            CONSTITUENCY CONNECT – SINDHANUR AC-58
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Generated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} • Authentication Certified
          </p>
        </div>

        {/* Report Content based on selection */}
        {reportType === 'constituency' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-900">Constituency Executive Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Total Villages</span>
                <span className="text-xl font-bold text-slate-900">{villages.length}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Total Grievances</span>
                <span className="text-xl font-bold text-slate-900">{issues.length}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Resolved Issues</span>
                <span className="text-xl font-bold text-emerald-700">{issues.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Active Projects</span>
                <span className="text-xl font-bold text-indigo-700">{projects.length}</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Revenue Villages & Demographics</h4>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 font-semibold text-slate-800">
                  <tr>
                    <th className="p-2 border">Village ID</th>
                    <th className="p-2 border">Village Name</th>
                    <th className="p-2 border">GP</th>
                    <th className="p-2 border">Voters</th>
                    <th className="p-2 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {villages.map(v => (
                    <tr key={v.village_id} className="border-b">
                      <td className="p-2 border font-mono">{v.village_name}</td>
                      <td className="p-2 border font-medium">{v.village_name} ({v.kannada_name})</td>
                      <td className="p-2 border">{v.gp_id}</td>
                      <td className="p-2 border">{v.voter_count?.toLocaleString() || '—'}</td>
                      <td className="p-2 border text-emerald-700 font-bold">{v.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'village' && targetVillage && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{targetVillage.village_name} ({targetVillage.kannada_name})</h3>
                <p className="text-xs text-slate-500 font-mono">Village: {targetVillage.village_name} • GP: {targetVillage.gp_id}</p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded text-xs">
                {targetVillage.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block">Voter Population</span>
                <span className="text-base font-bold text-slate-900">{targetVillage.voter_count?.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block">Pending Grievances</span>
                <span className="text-base font-bold text-amber-700">
                  {villageIssues.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block">Approved Works</span>
                <span className="text-base font-bold text-indigo-700">{villageProjects.length}</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">Recorded Grievances in this Village</h4>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 font-semibold text-slate-800">
                  <tr>
                    <th className="p-2 border">ID</th>
                    <th className="p-2 border">Title</th>
                    <th className="p-2 border">Category</th>
                    <th className="p-2 border">Priority</th>
                    <th className="p-2 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {villageIssues.map(i => (
                    <tr key={i.issue_id} className="border-b">
                      <td className="p-2 border font-mono">{i.issue_id}</td>
                      <td className="p-2 border font-medium">{i.title}</td>
                      <td className="p-2 border">{i.category}</td>
                      <td className="p-2 border font-semibold">{i.priority}</td>
                      <td className="p-2 border font-bold">{i.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'issues' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Grievance & Issue Resolution Ledger</h3>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 font-semibold text-slate-800">
                <tr>
                  <th className="p-2 border">Issue ID</th>
                  <th className="p-2 border">Title</th>
                  <th className="p-2 border">Category</th>
                  <th className="p-2 border">Village</th>
                  <th className="p-2 border">Priority</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Photo</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(i => (
                  <tr key={i.issue_id} className="border-b">
                    <td className="p-2 border font-mono">{i.issue_id}</td>
                    <td className="p-2 border font-medium">{i.title}</td>
                    <td className="p-2 border">{i.category}</td>
                    <td className="p-2 border font-mono">{getVillageName(i.village_id)}</td>
                    <td className="p-2 border">{i.priority}</td>
                    <td className="p-2 border font-bold">{i.status}</td>
                    <td className="p-2 border">
                      {i.photos?.length > 0 ? (
                        <img src={i.photos[0]} alt="Issue" className="w-16 h-16 object-cover rounded-lg border" />
                      ) : (
                        <span className="text-slate-400">No photo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'projects' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Development Projects & Capital Outlay</h3>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 font-semibold text-slate-800">
                <tr>
                  <th className="p-2 border">Project ID</th>
                  <th className="p-2 border">Project Name</th>
                  <th className="p-2 border">Department</th>
                  <th className="p-2 border">Budget (Lakhs)</th>
                  <th className="p-2 border">Physical Progress</th>
                  <th className="p-2 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.project_id} className="border-b">
                    <td className="p-2 border font-mono">{p.project_id}</td>
                    <td className="p-2 border font-medium">{p.project_name}</td>
                    <td className="p-2 border">{p.department}</td>
                    <td className="p-2 border font-mono font-bold">₹{(p.approved_cost / 100000).toFixed(2)}</td>
                    <td className="p-2 border font-bold text-emerald-700">{p.progress_percentage}%</td>
                    <td className="p-2 border font-semibold">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};



