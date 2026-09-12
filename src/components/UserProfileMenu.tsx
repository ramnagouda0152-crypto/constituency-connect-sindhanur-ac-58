import React, { useState } from 'react';
import { getVillageName } from "../utils/villageName";import {
  User as UserIcon,
  Shield,
  ChevronDown,
  Lock,
  LogOut,
  MapPin,
  Building2,
  CheckCircle2,
  UserCog,
  ShieldCheck
} from 'lucide-react';
import { User } from '../types.ts';
import { getVillageName } from "../utils/villageName";import { Language, t } from '../translations.ts';
import { getVillageName } from "../utils/villageName";
interface UserProfileMenuProps {
  currentUser: User;
  onSignOut: () => void;
  lang: Language;
  onOpenSecurityTests: () => void;
  onNavigate?: (view: string) => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  currentUser,
  onSignOut,
  lang,
  onOpenSecurityTests,
  onNavigate
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const roleStyles: Record<string, { bg: string; text: string; border: string }> = {
    SUPER_ADMIN: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    VILLAGE_HEAD: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
    MEMBER: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' }
  };

  const style = roleStyles[currentUser.role] || {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-200'
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-colors"
        title="User Account & Security"
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            currentUser.role === 'SUPER_ADMIN'
              ? 'bg-purple-500'
              : currentUser.role === 'VILLAGE_HEAD'
                ? 'bg-emerald-500'
                : 'bg-blue-500'
          }`}
        />
        <span className="font-bold text-slate-900 truncate max-w-[120px] sm:max-w-none">
          {currentUser.name}
        </span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${style.bg} ${style.text} ${style.border}`}>
          {currentUser.role}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{currentUser.mobile}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border ${style.bg} ${style.text} ${style.border}`}>
                    {currentUser.role}
                  </span>
                  <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                    {currentUser.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Jurisdiction Details */}
            {currentUser.village_id && (
              <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <div className="truncate">
                  <span className="font-semibold text-slate-800">Village: </span>
                  {currentUser.village_id}
                </div>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="p-2 space-y-1">
            {currentUser.role === 'SUPER_ADMIN' && onNavigate && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigate('user-management');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-purple-900 hover:bg-purple-50 rounded-xl transition-colors"
              >
                <UserCog className="w-4 h-4 text-purple-600" />
                <span>User & Voter Administration</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenSecurityTests();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-xl transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verify Security & Village Isolation</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

