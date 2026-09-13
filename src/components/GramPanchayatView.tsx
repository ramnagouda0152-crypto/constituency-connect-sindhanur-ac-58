import React, { useState, useEffect } from 'react';
import { Building2, Home, Users, ArrowRight, ArrowLeft, Plus } from 'lucide-react';
import { GramPanchayat, Village, User } from '../types.ts';
import { api } from '../services/api.ts';
import { Language, t } from '../translations.ts';

interface GramPanchayatViewProps {
  currentUser: User;
  lang: Language;
  onNavigateToVillage: (id: string) => void;
}

export const GramPanchayatView: React.FC<GramPanchayatViewProps> = ({
  currentUser,
  lang,
  onNavigateToVillage
}) => {
  const [gps, setGps] = useState<GramPanchayat[]>([]);
  const [selectedGpData, setSelectedGpData] = useState<{ gp: GramPanchayat; villages: Village[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGps();
  }, []);

  const loadGps = async () => {
    setLoading(true);
    try {
      const data = await api.getGramPanchayats();
      setGps(data);
    } catch (err: any) {
      console.error('Failed to load GPs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGp = async (gpId: string) => {
    try {
      const data = await api.getGramPanchayat(gpId);
      setSelectedGpData(data);
    } catch (err: any) {
      alert(`Failed to load GP details: ${err.message}`);
    }
  };

  if (selectedGpData) {
    const { gp, villages } = selectedGpData;
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedGpData(null)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{gp.gp_name}</h2>
                <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                  {gp.gp_id}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{gp.kannada_name} • Taluk: {gp.taluk_id}</p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-600">
            <span className="block text-slate-400">GP Coordinator</span>
            <span className="font-bold text-slate-900">{gp.coordinator_name || 'Assigned'}</span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Constituent Member Villages ({villages.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {villages.map(v => (
              <div
                key={v.village_id}
                onClick={() => onNavigateToVillage(v.village_id)}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-emerald-500/60 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11px] text-slate-400">{v.village_name}</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded">
                    {v.status}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{v.village_name}</h4>
                <p className="text-xs text-slate-500">{v.kannada_name}</p>
                <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                  <span>Voters: <strong className="text-slate-800">{v.voter_count?.toLocaleString()}</strong></span>
                  <span className="text-emerald-700 font-semibold">View →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('gramPanchayats', lang)}</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Local self-government clusters coordinating revenue villages under Sindhanur AC-58
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {gps.map(gp => (
          <div
            key={gp.gp_id}
            onClick={() => handleSelectGp(gp.gp_id)}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-semibold text-slate-400">{gp.gp_id}</span>
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {gp.gp_name}
              </h3>
              <p className="text-xs text-slate-500 font-medium mb-3">{gp.kannada_name}</p>

              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Taluk:</span>
                  <span className="font-semibold text-slate-800">{gp.taluk_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Coordinator:</span>
                  <span className="font-semibold text-slate-800">{gp.coordinator_name || 'Assigned'}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
              <span>Inspect Member Villages</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
