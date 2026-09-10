import React, { useState } from 'react';
import { Search, Bell, Globe, Menu, X, Landmark, Check, AlertCircle, Calendar, Briefcase, FileText } from 'lucide-react';
import { User, Notification } from '../types.ts';
import { Language, t } from '../translations.ts';
import { UserProfileMenu } from './UserProfileMenu.tsx';

interface NavbarProps {
  currentUser: User;
  onSignOut: () => void;
  lang: Language;
  onToggleLang: () => void;
  notifications: Notification[];
  onMarkNotifRead: (id: string) => void;
  onSearch: (q: string) => void;
  onOpenMobileMenu: () => void;
  onOpenSecurityTests: () => void;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSignOut,
  lang,
  onToggleLang,
  notifications,
  onMarkNotifRead,
  onSearch,
  onOpenMobileMenu,
  onOpenSecurityTests,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Assembly Constituency Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-3 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight leading-none">
                    {t('appName', lang)}
                  </span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wide">
                    AC-58
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {t('constituencyTitle', lang)} • {t('stateKarnataka', lang)}
                </p>
              </div>
            </button>
          </div>

          {/* Center Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={currentUser.role === 'VILLAGE_HEAD' ? `Search ${currentUser.village_id} records...` : t('search', lang)}
                className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-900 pl-9 pr-4 py-1.5 rounded-lg text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </form>

          {/* Right Action Icons & Persona Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Language Switcher Button */}
            <button
              onClick={onToggleLang}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              title="Toggle Language / ಭಾಷೆ ಬದಲಾಯಿಸಿ"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
            </button>

            {/* Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {t('notifications', lang)} ({unreadCount} new)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {currentUser.role === 'VILLAGE_HEAD' ? `Filtered to ${currentUser.village_id}` : 'Constituency wide'}
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.notification_id}
                          onClick={() => {
                            onMarkNotifRead(n.notification_id);
                            if (n.type === 'ISSUE') onNavigate('issues');
                            if (n.type === 'MEETING') onNavigate('meetings');
                            if (n.type === 'TASK') onNavigate('tasks');
                            setShowNotifications(false);
                          }}
                          className={`p-3 hover:bg-slate-50 cursor-pointer text-xs transition-colors flex items-start gap-2.5 ${
                            !n.is_read ? 'bg-emerald-50/40' : ''
                          }`}
                        >
                          <div className="mt-0.5">
                            {n.type === 'ISSUE' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                            {n.type === 'MEETING' && <Calendar className="w-4 h-4 text-blue-500" />}
                            {n.type === 'TASK' && <Briefcase className="w-4 h-4 text-emerald-500" />}
                            {n.type === 'PROJECT' && <FileText className="w-4 h-4 text-purple-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{n.title}</p>
                            <p className="text-slate-600 text-[11px] leading-tight mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 font-mono">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Account & Profile Menu */}
            <UserProfileMenu
              currentUser={currentUser}
              onSignOut={onSignOut}
              lang={lang}
              onOpenSecurityTests={onOpenSecurityTests}
              onNavigate={onNavigate}
            />

          </div>
        </div>
      </div>
    </header>
  );
};

export const MobileNav: React.FC<{
  currentView: string;
  onNavigate: (view: string) => void;
  lang: Language;
  role: string;
}> = ({ currentView, onNavigate, lang, role }) => {
  const isVillageHead = role === 'VILLAGE_HEAD';

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-2 py-1.5 flex items-center justify-around">
      <button
        onClick={() => onNavigate('dashboard')}
        className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
          currentView === 'dashboard' ? 'text-emerald-600 font-bold' : 'text-slate-600'
        }`}
      >
        <Landmark className="w-4 h-4 mb-0.5" />
        <span>{t('dashboard', lang)}</span>
      </button>

      <button
        onClick={() => onNavigate(isVillageHead ? 'my-village' : 'villages')}
        className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
          currentView === 'my-village' || currentView === 'villages' ? 'text-emerald-600 font-bold' : 'text-slate-600'
        }`}
      >
        <Briefcase className="w-4 h-4 mb-0.5" />
        <span>{isVillageHead ? t('myVillage', lang) : t('villages', lang)}</span>
      </button>

      <button
        onClick={() => onNavigate('issues')}
        className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
          currentView === 'issues' ? 'text-emerald-600 font-bold' : 'text-slate-600'
        }`}
      >
        <AlertCircle className="w-4 h-4 mb-0.5" />
        <span>{t('issues', lang)}</span>
      </button>

      <button
        onClick={() => onNavigate('meetings')}
        className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
          currentView === 'meetings' ? 'text-emerald-600 font-bold' : 'text-slate-600'
        }`}
      >
        <Calendar className="w-4 h-4 mb-0.5" />
        <span>{t('meetings', lang)}</span>
      </button>

      <button
        onClick={() => onNavigate('more-menu')}
        className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
          currentView === 'more-menu' ? 'text-emerald-600 font-bold' : 'text-slate-600'
        }`}
      >
        <Menu className="w-4 h-4 mb-0.5" />
        <span>More</span>
      </button>
    </nav>
  );
};
