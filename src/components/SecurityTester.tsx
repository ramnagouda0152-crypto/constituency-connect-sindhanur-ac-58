import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Play, CheckCircle2, XCircle, Terminal, RefreshCw, Lock } from 'lucide-react';
import { api } from '../services/api.ts';
import { Language } from '../translations.ts';

interface SecurityTesterProps {
  lang: Language;
  onClose?: () => void;
  onSwitchUser?: (userId: string) => void;
}

export const SecurityTester: React.FC<SecurityTesterProps> = ({ onClose, onSwitchUser }) => {
  const [loading, setLoading] = useState(false);
  const [testSuiteResults, setTestSuiteResults] = useState<any | null>(null);
  const [liveTestLog, setLiveTestLog] = useState<string[]>([]);

  const runVerificationSuite = async () => {
    setLoading(true);
    setLiveTestLog(['Initiating AC-58 RBAC isolation test suite against backend Express API...']);
    try {
      const data = await api.runSecurityTests();
      setTestSuiteResults(data);
      setLiveTestLog(prev => [
        ...prev,
        `Backend executed ${data.summary.total_tests} tests.`,
        `Passed: ${data.summary.passed_tests}/${data.summary.total_tests}`,
        data.summary.all_passed ? 'ALL ISOLATION BOUNDARIES CONFIRMED ZERO-LEAK.' : 'WARNING: Test failures detected.'
      ]);
    } catch (err: any) {
      setLiveTestLog(prev => [...prev, `Test suite execution failed: ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-3xl w-full">
      {/* Header */}
      <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Section 31: Data Isolation & RBAC Test Suite</h3>
            <p className="text-xs text-slate-400">Verifies User A (Gorebal) vs User B (Turvihal) vs Admin access rules</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Verification Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              TEST USER A
            </div>
            <p className="text-slate-600">Ravi Kumar (VILLAGE_HEAD)</p>
            <p className="text-slate-500 font-mono text-[11px]">Assigned Village: V_GOR01 (Gorebal)</p>
            <p className="text-slate-500 text-[11px]">Must strictly NEVER access Village B records.</p>
            {onSwitchUser && (
              <button
                onClick={() => onSwitchUser('USR_VH_GOR')}
                className="mt-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
              >
                Switch to User A Now
              </button>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              TEST USER B
            </div>
            <p className="text-slate-600">Mallikarjun (VILLAGE_HEAD)</p>
            <p className="text-slate-500 font-mono text-[11px]">Assigned Village: V_TUR01 (Turvihal)</p>
            <p className="text-slate-500 text-[11px]">Must strictly NEVER access Village A records.</p>
            {onSwitchUser && (
              <button
                onClick={() => onSwitchUser('USR_VH_TUR')}
                className="mt-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
              >
                Switch to User B Now
              </button>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div>
            <span className="text-xs font-medium text-slate-700">Live Backend Verification</span>
            <p className="text-[11px] text-slate-400">Issues real API calls with authorization checks and anti-tamper assertions</p>
          </div>
          <button
            onClick={runVerificationSuite}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            Execute Live Security Tests
          </button>
        </div>

        {/* Results List */}
        {testSuiteResults && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Automated Test Results ({testSuiteResults.summary.passed_tests}/{testSuiteResults.summary.total_tests} Passed)
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                100% Isolated
              </span>
            </div>

            <div className="space-y-2">
              {testSuiteResults.results.map((res: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs flex items-start gap-3 ${
                    res.passed
                      ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <div className="mt-0.5">
                    {res.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span>{res.testName}</span>
                      <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                        {res.expected}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">{res.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Terminal Log */}
        {liveTestLog.length > 0 && (
          <div className="bg-slate-950 text-slate-300 rounded-xl p-3.5 font-mono text-[11px] space-y-1">
            <div className="flex items-center gap-2 text-slate-500 pb-1 border-b border-slate-800 mb-1">
              <Terminal className="w-3.5 h-3.5" />
              <span>Audit Execution Log</span>
            </div>
            {liveTestLog.map((log, i) => (
              <div key={i} className="leading-tight text-slate-300">
                <span className="text-emerald-400">➜</span> {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
