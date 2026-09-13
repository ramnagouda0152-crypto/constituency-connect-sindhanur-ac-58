import React, { useState, useEffect } from 'react';
import {
  Home,
  Building2,
  Users,
  Vote,
  AlertCircle,
  TrendingUp,
  Calendar,
  Footprints,
  FileBox,
  FileText,
  Plus,
  Edit2,
  Lock,
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search
} from 'lucide-react';
import { Village, User, Booth, Issue, DevelopmentProject, VillageMeeting, FieldVisit, VillageDocument, GramPanchayat } from '../types.ts';
import { api } from '../services/api.ts';
import { getVillageName } from '../utils/villageName';
import { Language, t } from '../translations.ts';
import { AccessDeniedScreen, LoadingState } from './ErrorStates.tsx';
interface VillageManagementProps {
  currentUser: User;
  selectedVillageId?: string | null;
  lang: Language;
  onNavigate: (view: string) => void;
  onSelectVillage: (id: string | null) => void;
}
export const VillageManagement: React.FC<VillageManagementProps> = ({
  currentUser,
  selectedVillageId,
  lang,
  onNavigate,
  onSelectVillage
}) => {
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'Overview' | 'Team' | 'Booths' | 'Issues' | 'Development' | 'Meetings' | 'Field Visits' | 'Documents' | 'Reports'
  >('Overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [accessDeniedError, setAccessDeniedError] = useState<any | null>(null);
  // Add Village Modal State (Admin only)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVillageName, setNewVillageName] = useState('');
  const [newKannadaName, setNewKannadaName] = useState('');
  const [newGpId, setNewGpId] = useState('GP_GOR');
  const [newLat, setNewLat] = useState('15.7480');
  const [newLng, setNewLng] = useState('76.7120');
  const [newPop, setNewPop] = useState('2500');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAdmin = currentUser.role === 'SUPER_ADMIN';
  useEffect(() => {
    loadVillages();
  }, [currentUser]);
  useEffect(() => {
    if (selectedVillageId) {
      loadVillageProfile(selectedVillageId);
    } else {
      setProfileData(null);
      setAccessDeniedError(null);
    }
  }, [selectedVillageId, currentUser]);
  const loadVillages = async () => {
    setLoading(true);
    try {
      const data = await api.getVillages();
      setVillages(data);
    } catch (err: any) {
      console.error('Failed to load villages:', err);
    } finally {
      setLoading(false);
    }
  };
  const loadVillageProfile = async (id: string) => {
    setProfileLoading(true);
    setAccessDeniedError(null);
    try {
      const profile = await api.getVillageProfile(id);
      setProfileData(profile);
    } catch (err: any) {
      if (err.status === 403 || err.code === 'VILLAGE_ISOLATION_VIOLATION') {
        setAccessDeniedError({
          attemptedVillageId: id,
          userVillageId: currentUser.village_id || 'None',
          message: err.message
        });
      }
    } finally {
      setProfileLoading(false);
    }
  };
  const handleCreateVillage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVillageName || !newGpId) return;
    setIsSubmitting(true);
    try {
      const created = await api.createVillage({
        village_name: newVillageName,
        kannada_name: newKannadaName || newVillageName,
        gp_id: newGpId,
        latitude: Number(newLat),
        longitude: Number(newLng),
        population: Number(newPop)
      });
      setShowAddModal(false);
      setNewVillageName('');
      setNewKannadaName('');
      loadVillages();
    } catch (err: any) {
      alert(`Failed to add village: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  // If 403 Access Denied occurred when trying to open a village
  if (accessDeniedError) {
    return (
      <AccessDeniedScreen
        lang={lang}
        attemptedVillageId={accessDeniedError.attemptedVillageId}
        userVillageId={accessDeniedError.userVillageId}
        message={accessDeniedError.message}
        onReset={() => {
          setAccessDeniedError(null);
          onSelectVillage(null);
        }}
      />
    );
  }
  // Profile View
  if (selectedVillageId && (profileData || profileLoading)) {
    if (profileLoading) {
      return <LoadingState lang={lang} label="Loading Village Profile..." />;
    }
    const v: Village = profileData.village;
    const gp: GramPanchayat | undefined = profileData.gp;
    return (
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onSelectVillage(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Back to list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{v.village_name}</h1>
                  <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                    {v.village_name}
                  </span>
                </div>
                <p className="text-sm text-slate-500 font-medium">{v.kannada_name}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>GP: <strong className="text-slate-700">{gp?.gp_name || v.gp_id}</strong></span>
                  <span>•</span>
                  <span>Taluk: <strong className="text-slate-700">Sindhanur</strong></span>
                  <span>•</span>
                  <span>AC-58</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
                {v.status}
              </span>
            </div>
          </div>
          {/* Required 9 Tabs: Overview, Team, Booths, Issues, Development, Meetings, Field Visits, Documents, Reports */}
          <div className="flex items-center gap-1 mt-6 border-b border-slate-200 overflow-x-auto pb-0">
            {[
              'Overview',
              'Team',
              'Booths',
              'Issues',
              'Development',
              'Meetings',
              'Field Visits',
              'Documents',
              'Reports'
            ].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        {/* Tab Contents */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900">Demographic & Geographic Data</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 block">Population</span>
                  <span className="text-lg font-bold text-slate-900">{v.population?.toLocaleString() || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 block">Households</span>
                  <span className="text-lg font-bold text-slate-900">{v.households || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 block">Registered Voters</span>
                  <span className="text-lg font-bold text-emerald-700">{v.voter_count?.toLocaleString() || '—'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 block">Latitude</span>
                  <span className="font-mono text-slate-800">{v.latitude}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 block">Longitude</span>
                  <span className="font-mono text-slate-800">{v.longitude}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 block">Polling Booths</span>
                  <span className="text-lg font-bold text-slate-900">{profileData.booths.length}</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Village Team</h3>
              <div className="space-y-2">
                {profileData.team.map((u: User) => (
                  <div key={u.user_id} className="p-2 bg-slate-50 rounded-lg text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{u.name}</p>
                      <p className="text-[10px] text-slate-500">{u.role}</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-600">{u.mobile}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'Team' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Assigned Village Team</h3>
            <div className="divide-y divide-slate-100">
              {profileData.team.map((u: User) => (
                <div key={u.user_id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{u.name}</span>
                    <span className="ml-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">{u.role}</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">{u.email}</p>
                  </div>
                  <span className="font-mono text-slate-700">{u.mobile}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'Booths' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Polling Booths in {v.village_name}</h3>
            <div className="space-y-3">
              {profileData.booths.map((b: Booth) => (
                <div key={b.booth_id} className="p-3.5 border border-slate-100 rounded-xl bg-slate-50/50 flex items-start justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">Booth #{b.booth_number}</span>
                    <p className="text-slate-700 font-medium mt-0.5">{b.polling_station_name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{b.location}</p>
                  </div>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{b.voters_count} voters</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'Issues' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Civic Issues in {v.village_name}</h3>
            <div className="space-y-3">
              {profileData.issues.map((i: Issue) => (
                <div key={i.issue_id} className="p-3.5 border border-slate-100 rounded-xl bg-slate-50/50 flex justify-between items-start text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900">{i.title}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded">{i.category}</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">{i.description}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">{i.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'Development' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Development Projects in {v.village_name}</h3>
            <div className="space-y-3">
              {profileData.projects.map((p: DevelopmentProject) => (
                <div key={p.project_id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900">{p.project_name}</p>
                      <p className="text-[11px] text-slate-500">{p.department} • Contractor: {p.contractor_name}</p>
                    </div>
                    <span className="font-bold text-emerald-700">{p.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${p.progress_percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'Meetings' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Village Meetings</h3>
            <div className="space-y-3">
              {profileData.meetings.map((m: VillageMeeting) => (
                <div key={m.meeting_id} className="p-3.5 border border-slate-100 rounded-xl bg-slate-50/50 text-xs">
                  <div className="flex justify-between items-start font-semibold text-slate-900">
                    <span>{m.title}</span>
                    <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[10px]">{m.status}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1">{m.date} at {m.time} • {m.location}</p>
                  <p className="text-slate-700 text-[11px] mt-1.5"><strong>Agenda:</strong> {m.agenda}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'Field Visits' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Field Inspections</h3>
            <div className="space-y-3">
              {profileData.fieldVisits.map((fv: FieldVisit) => (
                <div key={fv.visit_id} className="p-3.5 border border-slate-100 rounded-xl bg-slate-50/50 text-xs">
                  <div className="flex justify-between items-start font-semibold text-slate-900">
                    <span>{fv.location}</span>
                    <span className="text-slate-500">{fv.date}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] mt-1">{fv.purpose}</p>
                  <p className="text-slate-500 text-[11px] mt-1">Logged by {fv.user_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'Documents' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Village Photos & Records</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profileData.documents.map((d: VillageDocument) => (
                <div key={d.file_id} className="p-3 border border-slate-100 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileBox className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-slate-900 truncate max-w-[180px]">{d.file_name}</p>
                      <p className="text-[10px] text-slate-400">{d.category} • {(d.file_size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="text-emerald-700 font-semibold text-[11px] hover:underline">
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'Reports' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Village Consolidated Report</h3>
            <p className="text-xs text-slate-500">
              Comprehensive report of polling booths, registered voters, civic issues and active projects in {v.village_name}.
            </p>
            <button
              onClick={() => onNavigate('reports')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Generate Printable Village Report
            </button>
          </div>
        )}
      </div>
    );
  }
  // Village List View
  const filteredVillages = villages.filter(v =>
    v.village_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.kannada_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.village_id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('villages', lang)}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {currentUser.role === 'VILLAGE_HEAD'
              ? `Authorized Village Jurisdiction: ${getVillageName(currentUser.village_id)}`
              : 'Managing constituent revenue villages across Sindhanur AC-58'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add New Village
          </button>
        )}
      </div>
      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter by village name or ID..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
        />
      </div>
      {/* Village Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVillages.map(v => (
          <div
            key={v.village_id}
            onClick={() => onSelectVillage(v.village_id)}
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-500/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold text-slate-500">{v.village_name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                  {v.status}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {v.village_name}
              </h3>
              <p className="text-xs text-slate-500 font-medium mb-3">{v.kannada_name}</p>
              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gram Panchayat:</span>
                  <span className="font-medium text-slate-800">{v.gp_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Voters:</span>
                  <span className="font-medium text-slate-800">{v.voter_count?.toLocaleString() || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Coordinates:</span>
                  <span className="font-mono text-[11px] text-slate-500">{v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
              <span>View Village Profile</span>
              <span>→</span>
            </div>
          </div>
        ))}
      </div>
      {/* Add Village Modal (Admin Only) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Add Constituent Village</h3>
            <p className="text-xs text-slate-500 mb-4">Register new revenue village under Sindhanur AC-58 hierarchy</p>
            <form onSubmit={handleCreateVillage} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Village Name (English)</label>
                <input
                  type="text"
                  required
                  value={newVillageName}
                  onChange={e => setNewVillageName(e.target.value)}
                  placeholder="e.g. Somalapura Kalan"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kannada Name (ಕನ್ನಡ ಹೆಸರು)</label>
                <input
                  type="text"
                  value={newKannadaName}
                  onChange={e => setNewKannadaName(e.target.value)}
                  placeholder="ಉದಾ: ಸೋಮಲಾಪುರ"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gram Panchayat</label>
                <select
                  value={newGpId}
                  onChange={e => setNewGpId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  <option value="GP_GOR">Gorebal Gram Panchayat</option>
                  <option value="GP_TUR">Turvihal Gram Panchayat</option>
                  <option value="GP_JAL">Jalihal Gram Panchayat</option>
                  <option value="GP_ALB">Alabanur Gram Panchayat</option>
                  <option value="GP_BAD">Badarli Gram Panchayat</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={newLat}
                    onChange={e => setNewLat(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={newLng}
                    onChange={e => setNewLng(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Village'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
