import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowLeft, RefreshCw, Lock } from 'lucide-react';
import { Language, t } from '../translations.ts';

interface AccessDeniedProps {
  lang: Language;
  attemptedVillageId?: string;
  userVillageId?: string;
  onReset?: () => void;
  message?: string;
}

export const AccessDeniedScreen: React.FC<AccessDeniedProps> = ({
  lang,
  attemptedVillageId,
  userVillageId,
  onReset,
  message
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mb-5 shadow-xs">
        <ShieldAlert className="w-8 h-8 text-red-600" />
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold mb-3">
        <Lock className="w-3.5 h-3.5" />
        HTTP 403 • FORBIDDEN
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        {t('accessDenied', lang)}
      </h2>

      <p className="text-slate-600 max-w-lg mb-6 leading-relaxed">
        {message || t('accessDeniedMessage', lang)}
      </p>

      {attemptedVillageId && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md w-full text-left text-xs mb-6 text-slate-700 space-y-1.5">
          <div className="font-semibold text-slate-900 flex items-center justify-between">
            <span>Security Isolation Rule Enforced</span>
            <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Active RBAC</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200">
            <span className="text-slate-500">Your Assigned Village:</span>
            <span className="font-mono font-medium text-slate-900">{userVillageId || 'None'}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Attempted Access Target:</span>
            <span className="font-mono font-medium text-red-600">{attemptedVillageId}</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1">
            Backend API automatically verified your credentials and denied database query access according to Section 5 mandate.
          </p>
        </div>
      )}

      {onReset && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Authorized View
        </button>
      )}
    </div>
  );
};

export const NotFoundScreen: React.FC<{ lang: Language; onBack?: () => void }> = ({ lang, onBack }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-slate-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-1">{t('pageNotFound', lang)}</h3>
      <p className="text-slate-500 text-sm max-w-md mb-6">
        The requested constituency record or page does not exist or has been relocated.
      </p>
      {onBack && (
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm font-medium transition-colors"
        >
          Return to Dashboard
        </button>
      )}
    </div>
  );
};

export const LoadingState: React.FC<{ lang: Language; label?: string }> = ({ lang, label }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
      <p className="text-slate-600 text-sm font-medium">{label || t('loading', lang)}</p>
      <p className="text-xs text-slate-400 mt-1">Verifying permissions with AC-58 secure backend</p>
    </div>
  );
};
