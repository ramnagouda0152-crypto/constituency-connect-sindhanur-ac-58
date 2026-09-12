import React, { useState, useEffect } from 'react';
import { getVillageName } from "../utils/villageName";import { Footprints, Plus, MapPin, Calendar, CheckSquare, Camera, Shield, User } from 'lucide-react';
import { getVillageName } from "../utils/villageName";import { FieldVisit, User as UserType, Village } from '../types.ts';
import { getVillageName } from "../utils/villageName";import { api } from '../services/api.ts';
import { getVillageName } from "../utils/villageName";import { Language, t } from '../translations.ts';
import { getVillageName } from "../utils/villageName";
interface FieldVisitsProps {
  currentUser: UserType;
  villages: Village[];
  lang: Language;
}

export const FieldVisits: React.FC<FieldVisitsProps> = ({ currentUser, villages, lang }) => {
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);

  // New visit form
  const [purpose, setPurpose] = useState('');
  const [observations, setObservations] = useState('');
  const [location, setLocation] = useState('');
  const [villageId, setVillageId] = useState(currentUser.village_id || 'V_GOR01');
  const [followUp, setFollowUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVillageHead = currentUser.role === 'VILLAGE_HEAD';

  useEffect(() => {
    loadVisits();
  }, [currentUser]);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const data = await api.getFieldVisits();
      setVisits(data);
    } catch (err: any) {
      console.error('Failed to load visits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose || !location) return;
    setIsSubmitting(true);
    try {
      const targetVillage = isVillageHead ? (currentUser.village_id || 'V_GOR01') : villageId;
      await api.createFieldVisit({
        purpose,
        observations,
        location,
        village_id: targetVillage,
        follow_up_needed: followUp,
        gps_lat: 15.7482,
        gps_lng: 76.7124
      });
      setShowLogModal(false);
      setPurpose('');
      setObservations('');
      setLocation('');
      loadVisits();
    } catch (err: any) {
      alert(`Failed to log visit: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('fieldVisits', lang)}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isVillageHead
              ? `Inspection logs for ${getVillageName(currentUser.village_id)}`
              : 'Constituency-wide field visits, inspections, and spot verification logs'}
          </p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Log Field Visit
        </button>
      </div>

      {/* Visits List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <p className="text-xs text-slate-400 py-6 text-center col-span-2">Loading field visits...</p>
        ) : visits.length === 0 ? (
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            No field visits logged in this jurisdiction.
          </div>
        ) : (
          visits.map(v => (
            <div key={v.visit_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-500">{v.visit_id}</span>
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                  Village: {v.village_id}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{v.purpose}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{v.location}</span>
                  <span>•</span>
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{v.date}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
                <span className="text-slate-400 text-[10px] block font-semibold uppercase tracking-wider mb-0.5">
                  Observations
                </span>
                <p className="leading-relaxed">{v.observations}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Logged by: <strong>{v.user_name}</strong></span>
                {v.follow_up_needed ? (
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold text-[10px]">
                    Follow-up Required
                  </span>
                ) : (
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[10px]">
                    Verified Clean
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Log Visit Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Record Field Inspection</h3>
            <p className="text-xs text-slate-500 mb-4">Capture observations and spot verification details</p>

            <form onSubmit={handleLogVisit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Visit Purpose</label>
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="e.g. CC Road inspection at Ward 3"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location / Landmark</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Near Government High School"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              {!isVillageHead && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Village</label>
                  <select
                    value={villageId}
                    onChange={e => setVillageId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    {villages.map(v => (
                      <option key={v.village_id} value={v.village_id}>
                        {v.village_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Key Observations & Findings</label>
                <textarea
                  required
                  rows={3}
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  placeholder="Note quality of work, public grievance inputs, or required materials..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="followup"
                  checked={followUp}
                  onChange={e => setFollowUp(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="followup" className="text-slate-700 font-medium">Flag for departmental follow-up</label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Record Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

