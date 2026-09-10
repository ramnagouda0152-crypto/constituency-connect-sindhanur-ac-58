import React, { useState, useEffect } from 'react';
import { Users, Plus, Phone, Mail, Shield, UserCheck, Lock } from 'lucide-react';
import { User, Village } from '../types.ts';
import { api } from '../services/api.ts';
import { Language, t } from '../translations.ts';

interface TeamManagementProps {
  currentUser: User;
  villages: Village[];
  lang: Language;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({
  currentUser,
  villages,
  lang
}) => {
  const [team, setTeam] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'VILLAGE_HEAD' | 'FIELD_WORKER'>('FIELD_WORKER');
  const [villageId, setVillageId] = useState(currentUser.village_id || 'V_GOR01');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVillageHead = currentUser.role === 'VILLAGE_HEAD';

  useEffect(() => {
    loadTeam();
  }, [currentUser]);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const data = await api.getTeam();
      setTeam(data);
    } catch (err: any) {
      console.error('Failed to load team:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile) return;
    setIsSubmitting(true);
    try {
      const targetVillage = isVillageHead ? (currentUser.village_id || 'V_GOR01') : villageId;
      await api.createTeamMember({
        name,
        mobile,
        email: email || `${name.toLowerCase().replace(/\s+/g, '')}@sindhanur.gov.in`,
        role,
        village_id: targetVillage,
        status: 'ACTIVE'
      });
      setShowAddModal(false);
      setName('');
      setMobile('');
      setEmail('');
      loadTeam();
    } catch (err: any) {
      alert(`Failed to add team member: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            {isVillageHead ? t('myTeam', lang) : t('team', lang)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isVillageHead
              ? `Village committee, booth convenors, and grassroot workers for ${currentUser.village_id}`
              : 'Constituency leadership, GP coordinators, and village cadres'}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-xs text-slate-400 py-6 text-center col-span-3">Loading team members...</p>
        ) : team.length === 0 ? (
          <div className="col-span-3 bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            No team members assigned in this jurisdiction.
          </div>
        ) : (
          team.map(m => (
            <div key={m.user_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] text-slate-400">{m.user_id}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {m.status}
                  </span>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{m.name}</h3>
                    <span className="text-[11px] font-semibold text-emerald-700 block mt-0.5">
                      {m.role}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono font-medium text-slate-800">{m.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500 truncate">{m.email}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Jurisdiction</span>
                <span className="font-mono font-bold text-emerald-700">
                  {m.village_id || 'All Constituency'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Team Member</h3>
            <p className="text-xs text-slate-500 mb-4">Enroll field worker or village coordinator</p>

            <form onSubmit={handleAddMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Anand Gowda"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="anand@sindhanur.gov.in"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Designation Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="FIELD_WORKER">Field Worker / Booth Convenor</option>
                  <option value="VILLAGE_HEAD">Village Head</option>
                </select>
              </div>

              {!isVillageHead && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Village</label>
                  <select
                    value={villageId}
                    onChange={e => setVillageId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    {villages.map(v => (
                      <option key={v.village_id} value={v.village_id}>
                        {v.village_name} ({v.village_id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
                  {isSubmitting ? 'Saving...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
