import React, { useState, useEffect } from 'react';
import { Vote, Plus, MapPin, Search, Users } from 'lucide-react';
import { Booth, Village, User } from '../types.ts';
import { api } from '../services/api.ts';
import { Language, t } from '../translations.ts';

interface BoothManagementProps {
  currentUser: User;
  villages: Village[];
  lang: Language;
}

export const BoothManagement: React.FC<BoothManagementProps> = ({
  currentUser,
  villages,
  lang
}) => {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Booth Form
  const [boothNumber, setBoothNumber] = useState('');
  const [stationName, setStationName] = useState('');
  const [votersCount, setVotersCount] = useState('');
  const [location, setLocation] = useState('');
  const [villageId, setVillageId] = useState('V_GOR01');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadBooths();
  }, []);

  const loadBooths = async () => {
    setLoading(true);
    try {
      const data = await api.getBooths();
      setBooths(data);
    } catch (err: any) {
      console.error('Failed to load booths:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBooth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boothNumber || !stationName) return;
    setIsSubmitting(true);
    try {
      await api.createBooth({
        booth_number: boothNumber,
        polling_station_name: stationName,
        voters_count: Number(votersCount) || 800,
        location,
        village_id: villageId,
        status: 'ACTIVE'
      });
      setShowAddModal(false);
      setBoothNumber('');
      setStationName('');
      loadBooths();
    } catch (err: any) {
      alert(`Failed to add booth: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBooths = booths.filter(b =>
    b.polling_station_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.booth_number.includes(searchQuery) ||
    b.village_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('booths', lang)}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Assembly constituency polling stations, room allocations, and voter counts
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Polling Booth
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search booth number, school, or village..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-xs"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Booth #</th>
                <th className="py-3 px-4">Polling Station Name</th>
                <th className="py-3 px-4">Assigned Village</th>
                <th className="py-3 px-4">Location / Premises</th>
                <th className="py-3 px-4">Voters Count</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBooths.map(b => (
                <tr key={b.booth_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">#{b.booth_number}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{b.polling_station_name}</td>
                  <td className="py-3 px-4 text-emerald-700 font-semibold">{villages.find(v => v.village_id === b.village_id)?.village_name || b.village_id}</td>
                  <td className="py-3 px-4 text-slate-500">{b.location}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{b.voters_count?.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Booth Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Polling Booth</h3>
            <p className="text-xs text-slate-500 mb-4">Register station in Sindhanur AC-58 electoral directory</p>

            <form onSubmit={handleCreateBooth} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Booth Number</label>
                  <input
                    type="text"
                    required
                    value={boothNumber}
                    onChange={e => setBoothNumber(e.target.value)}
                    placeholder="e.g. 142"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registered Voters</label>
                  <input
                    type="number"
                    value={votersCount}
                    onChange={e => setVotersCount(e.target.value)}
                    placeholder="e.g. 850"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Polling Station Name</label>
                <input
                  type="text"
                  required
                  value={stationName}
                  onChange={e => setStationName(e.target.value)}
                  placeholder="e.g. Govt Higher Primary School (East Wing)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Location Details</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Main Street, Near Gram Chavadi"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Village</label>
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
                  {isSubmitting ? 'Saving...' : 'Register Booth'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
