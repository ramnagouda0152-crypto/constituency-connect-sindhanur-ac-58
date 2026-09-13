import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  MapPin,
  Camera,
  MessageSquare,
  Shield,
  User,
  Search,
  ExternalLink
} from 'lucide-react';
import { Issue, User as UserType, Village } from '../types.ts';
import { api } from '../services/api.ts';
import { getVillageName } from '../utils/villageName';
import { Language, t } from '../translations.ts';

interface IssueTrackerProps {
  currentUser: UserType;
  villages: Village[];
  lang: Language;
  onOpenIssueModal?: boolean;
  onCloseIssueModal?: () => void;
}

export const IssueTracker: React.FC<IssueTrackerProps> = ({
  currentUser,
  villages,
  lang,
  onOpenIssueModal,
  onCloseIssueModal
}) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedVillageFilter, setSelectedVillageFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Status Change Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<Issue['status']>('IN_PROGRESS');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // New Issue Modal State
  const [showNewModal, setShowNewModal] = useState(onOpenIssueModal || false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('Water Supply');
  const [newPriority, setNewPriority] = useState<Issue['priority']>('MEDIUM');
  const [newVillageId, setNewVillageId] = useState(currentUser.village_id || 'V_GOR01');
  const [newPhoto, setNewPhoto] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const isVillageHead = currentUser.role === 'VILLAGE_HEAD';

  useEffect(() => {
    loadIssues();
  }, [currentUser, selectedCategory, selectedPriority, selectedStatus, selectedVillageFilter]);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const data = await api.getIssues({
        category: selectedCategory || undefined,
        priority: selectedPriority || undefined,
        status: selectedStatus || undefined,
        village_id: isVillageHead ? currentUser.village_id || undefined : (selectedVillageFilter || undefined)
      });
      setIssues(data);
    } catch (err: any) {
      console.error('Failed to load issues:', err);
    } finally {
      setLoading(false);
    }
  };
const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    setNewPhoto(reader.result as string);
  };

  reader.readAsDataURL(file);
};
  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDesc) return;
    setIsSubmittingNew(true);
    try {
      const targetVillage = isVillageHead ? (currentUser.village_id || 'V_GOR01') : newVillageId;
      await api.createIssue({
        title: newTitle,
        description: newDesc,
        category: newCat as any,
        priority: newPriority,
        village_id: targetVillage,
        photos: newPhoto ? [newPhoto] : [],
      });

      setShowNewModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewPhoto('');
      loadIssues();
    } catch (err: any) {
      alert(`Failed to create issue: ${err.message}`);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!selectedIssue) return;

    const confirmed = window.confirm(
      `Permanently delete issue "${selectedIssue.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await api.deleteIssue(selectedIssue.issue_id);
      setIssues(prev => prev.filter(i => i.issue_id !== selectedIssue.issue_id));
      setSelectedIssue(null);
      alert('Issue permanently deleted.');
    } catch (err: any) {
      alert(`Failed to delete issue: ${err.message}`);
    }
  };
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !statusRemarks.trim()) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await api.updateIssueStatus(
        selectedIssue.issue_id,
        targetStatus,
        statusRemarks
      );
      setSelectedIssue(updated);
      setShowStatusModal(false);
      setStatusRemarks('');
      loadIssues();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const categories = [
    'Water Supply',
    'Electricity',
    'Roads & Drainage',
    'Sanitation',
    'Health',
    'Education',
    'Agriculture / Irrigation',
    'Housing / Welfare',
    'Public Safety',
    'Other'
  ];

  const statuses: Issue['status'][] = [
    'NEW',
    'VERIFIED',
    'ASSIGNED',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
  ];

  const filteredIssues = issues.filter(i =>
    i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.issue_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('issues', lang)}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isVillageHead
              ? `Tracking civic and infrastructure issues for ${getVillageName(currentUser.village_id)}`
              : 'Constituency-wide grievance and issue lifecycle management'}
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          {t('reportIssue', lang)}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 pb-2 border-b border-slate-100">
          <Filter className="w-3.5 h-3.5 text-emerald-600" />
          <span>Filters & Search</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Search Issues</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ID, keyword, or title..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Workflow Status</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
            >
              <option value="">All Statuses</option>
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Priority</label>
            <select
              value={selectedPriority}
              onChange={e => setSelectedPriority(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Village Filter (Admin Only as required by Section 13) */}
          {!isVillageHead && (
            <div className="sm:col-span-2 md:col-span-4">
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Constituency Village Filter (Admin Only)
              </label>
              <select
                value={selectedVillageFilter}
                onChange={e => setSelectedVillageFilter(e.target.value)}
                className="w-full max-w-sm px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
              >
                <option value="">All Villages in Sindhanur AC-58</option>
                {villages.map(v => (
                  <option key={v.village_id} value={v.village_id}>
                    {v.village_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Issues List & Details View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Cols: Issue Cards */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <p className="text-xs text-slate-400 py-8 text-center">Loading issues...</p>
          ) : filteredIssues.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
              No civic issues match your current filters.
            </div>
          ) : (
            filteredIssues.map(issue => {
              const isSelected = selectedIssue?.issue_id === issue.issue_id;
              return (
                <div
                  key={issue.issue_id}
                  onClick={() => setSelectedIssue(issue)}
                  className={`bg-white rounded-2xl border p-4 transition-all cursor-pointer shadow-xs ${
                    isSelected ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                          {issue.issue_id}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {issue.category}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          issue.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          issue.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {issue.priority}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • Village: <strong className="text-slate-700">{getVillageName(issue.village_id)}</strong>
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900">{issue.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1">{issue.description}</p>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        issue.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                        issue.status === 'CLOSED' ? 'bg-slate-200 text-slate-800' :
                        issue.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                        issue.status === 'ASSIGNED' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {issue.status}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(issue.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Photo Thumbnail preview if present */}
                  {issue.photos && issue.photos.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100">
                      <Camera className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[11px] text-slate-500 font-medium">1 Attached Site Photo</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right 1 Col: Selected Issue Details & Workflow Actions */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs h-fit space-y-4">
          {selectedIssue ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-mono text-xs font-bold text-slate-500">{selectedIssue.issue_id}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {selectedIssue.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedIssue.title}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{selectedIssue.description}</p>
              </div>

              {/* Photo Preview as required by Section 13 */}
              {selectedIssue.photos && selectedIssue.photos.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">Inspection Photos:</span>
                  <div className="rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-50">
                    <img
                      src={selectedIssue.photos[0]}
                      alt="Site Inspection"
                      className="w-full h-40 object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Village ID:</span>
                  <span className="font-mono font-bold text-slate-800">{getVillageName(selectedIssue.village_id)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-semibold text-slate-800">{selectedIssue.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Priority:</span>
                  <span className="font-semibold text-slate-800">{selectedIssue.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned To:</span>
                  <span className="text-slate-800">{selectedIssue.assigned_to || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reported By:</span>
                  <span className="text-slate-800">{selectedIssue.reported_by}</span>
                </div>
              </div>

              {/* Workflow Actions Section:
                  Workflow: New → Verified → Assigned → In Progress → Resolved → Closed
              */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 block mb-2">Advance Issue Workflow:</span>
                <div className="grid grid-cols-2 gap-2">
                  {statuses.map(st => (
                    <button
                      key={st}
                      disabled={selectedIssue.status === st}
                      onClick={() => {
                        setTargetStatus(st);
                        setShowStatusModal(true);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                        selectedIssue.status === st
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      Mark as {st}
                    </button>
                  ))}
                </div>
              </div>

              {currentUser.role === 'SUPER_ADMIN' && (
                <div className="pt-3 mt-3 border-t border-red-100">
                  <button
                    type="button"
                    onClick={handleDeleteIssue}
                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                  >
                    Permanently Delete Issue
                  </button>
                  <p className="text-[10px] text-red-500 mt-1.5 text-center">
                    This action cannot be undone.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Select an issue from the left list to view details, photos, and progress the resolution workflow.
            </div>
          )}
        </div>

      </div>

      {/* Status Update Modal (with mandatory audit remarks as required by Section 13) */}
      {showStatusModal && selectedIssue && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Update Issue Workflow: {targetStatus}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Audit log will record this status transition and notes.
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Remarks (Mandatory)</label>
                <textarea
                  required
                  rows={3}
                  value={statusRemarks}
                  onChange={e => setStatusRemarks(e.target.value)}
                  placeholder="e.g. Field team inspected valve leak, replacement pipeline dispatched."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Commit Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Issue Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Log Civic / Development Issue</h3>
            <p className="text-xs text-slate-500 mb-4">
              Record new grievance for verification and action
            </p>

            <form onSubmit={handleCreateIssue} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Damaged Borewell Motor in Ward 2"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Provide location details, impact on residents, and urgent requirements..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCat}
                    onChange={e => setNewCat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              {/* Village selection (Village Head is locked to their village) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Village</label>
                {isVillageHead ? (
                  <input
                    type="text"
                    disabled
                    value={`${getVillageName(currentUser.village_id)} (Your Assigned Jurisdiction)`}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 font-mono"
                  />
                ) : (
                  <select
                    value={newVillageId}
                    onChange={e => setNewVillageId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    {villages.map(v => (
                      <option key={v.village_id} value={v.village_id}>
                        {v.village_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <div>
  <label className="block font-semibold text-slate-700 mb-1">
    Photo (Optional)
  </label>

  <input
    type="file"
    accept="image/*"
    capture="environment"
    onChange={handlePhotoChange}
    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
  />

  {newPhoto && (
    <div className="mt-2">
      <img
        src={newPhoto}
        alt="Selected issue"
        className="w-full max-h-48 object-cover rounded-lg border border-slate-200"
      />
      <button
        type="button"
        onClick={() => setNewPhoto('')}
        className="mt-2 text-xs text-red-600 hover:text-red-700"
      >
        Remove Photo
      </button>
    </div>
  )}
</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmittingNew ? 'Saving...' : 'Submit Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

