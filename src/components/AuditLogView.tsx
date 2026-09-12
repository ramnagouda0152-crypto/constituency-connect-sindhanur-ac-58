import React, { useState, useEffect } from 'react';
import { ScrollText, Shield, User, Clock, Filter, AlertTriangle } from 'lucide-react';
import { AuditLog, User as UserType } from '../types.ts';
import { api } from '../services/api.ts';
import { Language, t } from '../translations.ts';
import { OFFICIAL_VILLAGES_AC58 } from '../data/villagesList.ts';

interface AuditLogViewProps {
  currentUser: UserType;
  lang: Language;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ currentUser, lang }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, [currentUser]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('auditLogs', lang)}</h1>
            <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
              ADMIN ONLY
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable system audit trail tracking database mutations, status workflows, and security operations
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor / User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Record Type & ID</th>
                <th className="py-3 px-4">Village Name</th>
                <th className="py-3 px-4">Changes / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading audit trail...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No audit logs recorded yet.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.log_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{log.user_id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {log.record_type}: {log.record_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">
                      {OFFICIAL_VILLAGES_AC58.find(v => v.village_id === log.village_id)?.village_name || 'Global'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {log.changes ? JSON.stringify(log.changes) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

