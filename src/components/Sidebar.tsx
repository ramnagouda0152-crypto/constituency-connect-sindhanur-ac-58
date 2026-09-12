import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Home,
  Vote,
  Users,
  AlertCircle,
  TrendingUp,
  Footprints,
  Calendar,
  CheckSquare,
  FileText,
  FileBox,
  Bell,
  UserCog,
  ScrollText,
  Settings,
  User,
  Shield,
  Video,
  X
} from 'lucide-react';
import { UserRole } from '../types.ts';
import { Language, t } from '../translations.ts';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  role: UserRole;
  villageId?: string | null;
  villageName?: string;
  lang: Language;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  role,
  villageId,
  villageName,
  lang,
  onCloseMobile
}) => {
  const isVillageHead = role === 'VILLAGE_HEAD';
  const isMember = role === 'MEMBER';
  const isVillageScoped = isVillageHead || isMember;

  // Specific menu structures strictly as demanded in Section 9
  const adminMenuItems = [
    { id: 'dashboard', label: t('dashboard', lang), icon: LayoutDashboard },
    { id: 'gram-panchayats', label: t('gramPanchayats', lang), icon: Building2 },
    { id: 'villages', label: t('villages', lang), icon: Home },
    { id: 'booths', label: t('booths', lang), icon: Vote },
    { id: 'team', label: t('team', lang), icon: Users },
    { id: 'issues', label: t('issues', lang), icon: AlertCircle },
    { id: 'development', label: t('development', lang), icon: TrendingUp },
    { id: 'field-visits', label: t('fieldVisits', lang), icon: Footprints },
    { id: 'meetings', label: t('meetings', lang), icon: Calendar },
    { id: 'video-conference', label: 'Video Conference', icon: Video },
    { id: 'tasks', label: t('tasks', lang), icon: CheckSquare },
    { id: 'reports', label: t('reports', lang), icon: FileText },
    { id: 'notifications', label: t('notifications', lang), icon: Bell },
    { id: 'user-management', label: t('userManagement', lang), icon: UserCog },
    { id: 'audit-logs', label: t('auditLogs', lang), icon: ScrollText },
    { id: 'settings', label: t('settings', lang), icon: Settings }
  ];

  const villageHeadMenuItems = [
    { id: 'my-village', label: t('myVillage', lang), icon: Home },
    { id: 'team', label: t('myTeam', lang), icon: Users },
    { id: 'issues', label: t('issues', lang), icon: AlertCircle },
    { id: 'development', label: t('development', lang), icon: TrendingUp },
    { id: 'field-visits', label: t('fieldVisits', lang), icon: Footprints },
    { id: 'meetings', label: t('meetings', lang), icon: Calendar },
    { id: 'video-conference', label: 'Video Conference', icon: Video },
    { id: 'tasks', label: t('tasks', lang), icon: CheckSquare },
    { id: 'documents', label: t('documents', lang), icon: FileBox },
    { id: 'reports', label: t('villageReports', lang), icon: FileText },
    { id: 'notifications', label: t('notifications', lang), icon: Bell },
    { id: 'profile', label: t('myProfile', lang), icon: User }
  ];

  const memberMenuItems = [
    { id: 'my-village', label: t('myVillage', lang), icon: Home },
    { id: 'issues', label: t('issues', lang), icon: AlertCircle },
    { id: 'development', label: t('development', lang), icon: TrendingUp },
    { id: 'meetings', label: t('meetings', lang), icon: Calendar },
    { id: 'video-conference', label: 'Video Conference', icon: Video },
    { id: 'tasks', label: t('tasks', lang), icon: CheckSquare },
    { id: 'documents', label: t('documents', lang), icon: FileBox },
    { id: 'notifications', label: t('notifications', lang), icon: Bell },
    { id: 'profile', label: t('myProfile', lang), icon: User }
  ];

  const menuItems = isVillageHead ? villageHeadMenuItems : isMember ? memberMenuItems : adminMenuItems;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 shrink-0">
      {/* Sidebar Header / Jurisdiction Tag */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isVillageScoped ? 'bg-emerald-500' : 'bg-purple-500'}`}></span>
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              {isVillageHead ? 'VILLAGE HEAD' : isMember ? 'VILLAGE MEMBER' : 'SUPER ADMIN'}
            </span>
          </div>
          {isVillageScoped ? (
            <div className="mt-1">
              <p className="text-sm font-bold text-white truncate">{villageName || 'My Village'}</p>
              <p className="text-[11px] font-mono text-emerald-400">{villageId}</p>
            </div>
          ) : (
            <div className="mt-1">
              <p className="text-sm font-bold text-white">Sindhanur AC-58</p>
              <p className="text-[11px] text-slate-400">All Taluk & GP Zones</p>
            </div>
          )}
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs shadow-emerald-950/40'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Security Badge */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/40 text-left">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-400">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          <span>RBAC Isolation Active</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
          {isVillageScoped
            ? `Strictly isolated to ${villageId}. Non-village records rejected with 403.`
            : 'Super Admin full constituency oversight.'}
        </p>
      </div>
    </aside>
  );
};


