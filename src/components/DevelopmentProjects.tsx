import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, Calendar, User, Building, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DevelopmentProject, User as UserType } from '../types.ts';
import { api } from '../services/api.ts';
import { Language, t } from '../translations.ts';
import { getVillageName } from '../utils/villageName.ts';

interface DevelopmentProjectsProps {
  currentUser: UserType;
  lang: Language;
}

export const DevelopmentProjects: React.FC<DevelopmentProjectsProps> = ({ currentUser, lang }) => {
  const [projects, setProjects] = useState<DevelopmentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<DevelopmentProject | null>(null);
  const [newProgress, setNewProgress] = useState(50);
  const [progressRemarks, setProgressRemarks] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const isVillageHead = currentUser.role === 'VILLAGE_HEAD';

  useEffect(() => {
    loadProjects();
  }, [currentUser]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setIsUpdating(true);
    try {
      await api.updateProjectProgress(selectedProject.project_id, newProgress, progressRemarks);
      setShowProgressModal(false);
      setProgressRemarks('');
      loadProjects();
    } catch (err: any) {
      alert(`Failed to update progress: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('development', lang)}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isVillageHead
              ? `Public works and development projects in ${getVillageName(currentUser.village_id)}`
              : 'Tracking public works schemes and infrastructure progress across AC-58'}
          </p>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-xs text-slate-400 py-6 text-center col-span-2">Loading projects...</p>
        ) : projects.length === 0 ? (
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            No development projects recorded in this jurisdiction.
          </div>
        ) : (
          projects.map(p => (
            <div key={p.project_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                    {p.project_id}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                    p.status === 'IN_PROGRESS' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {p.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{p.project_name}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {p.department} • <strong className="text-slate-700">{p.scheme_name}</strong>
                </p>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-2 my-3 p-3 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Approved Budget</span>
                    <span className="font-bold text-slate-900">₹{(p.approved_cost / 100000).toFixed(2)} Lakhs</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Village Jurisdiction</span>
                    <span className="font-mono font-bold text-emerald-700">{getVillageName(p.village_id)}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Physical Progress</span>
                    <span className="text-emerald-700">{p.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${p.progress_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Timeline & Contractor */}
                <div className="mt-3 text-[11px] text-slate-500 space-y-1">
                  <p><strong>Contractor:</strong> {p.contractor_name}</p>
                  <p><strong>Timeline:</strong> {p.start_date} to {p.expected_completion}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Target completion: {p.expected_completion}</span>
                <button
                  onClick={() => {
                    setSelectedProject(p);
                    setNewProgress(p.progress_percentage);
                    setShowProgressModal(true);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
                >
                  Update Progress
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Update Progress Modal */}
      {showProgressModal && selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Update Project Progress</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedProject.project_name}</p>

            <form onSubmit={handleUpdateProgress} className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="font-semibold text-slate-700">Completion Percentage: {newProgress}%</label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newProgress}
                  onChange={e => setNewProgress(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inspection Remarks</label>
                <textarea
                  required
                  rows={3}
                  value={progressRemarks}
                  onChange={e => setProgressRemarks(e.target.value)}
                  placeholder="Record site inspection milestone notes..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProgressModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Progress'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
