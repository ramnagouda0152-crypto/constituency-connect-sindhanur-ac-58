import React, { useState, useEffect } from 'react';
import {
  User,
  DashboardStats,
  Village,
  Issue,
  DevelopmentProject,
  VillageMeeting,
  FieldVisit,
  Notification
} from './types.ts';
import { Language, t } from './translations.ts';
import { api } from './services/api.ts';
import { Navbar, MobileNav } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { VillageHeadDashboard } from './components/VillageHeadDashboard.tsx';
import { VillageManagement } from './components/VillageManagement.tsx';
import { IssueTracker } from './components/IssueTracker.tsx';
import { DevelopmentProjects } from './components/DevelopmentProjects.tsx';
import { FieldVisits } from './components/FieldVisits.tsx';
import { MeetingsView } from './components/MeetingsView.tsx';
import { TaskManagement } from './components/TaskManagement.tsx';
import { DocumentsView } from './components/DocumentsView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { GramPanchayatView } from './components/GramPanchayatView.tsx';
import { BoothManagement } from './components/BoothManagement.tsx';
import { TeamManagement } from './components/TeamManagement.tsx';
import { AuditLogView } from './components/AuditLogView.tsx';
import { SecurityTester } from './components/SecurityTester.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { UserManagement } from './components/UserManagement.tsx';
import { JitsiConferenceList } from './components/JitsiConferenceList.tsx';
import { AccessDeniedScreen, LoadingState, NotFoundScreen } from './components/ErrorStates.tsx';
import { Search, X, ShieldAlert, CheckCircle2, AlertCircle, LogIn, Landmark } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userVillage, setUserVillage] = useState<Village | undefined>(undefined);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [lang, setLang] = useState<Language>('en');
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [villages, setVillages] = useState<Village[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [projects, setProjects] = useState<DevelopmentProject[]>([]);
  const [meetings, setMeetings] = useState<VillageMeeting[]>([]);
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showSecurityTests, setShowSecurityTests] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [accessDeniedViolation, setAccessDeniedViolation] = useState<{
    attemptedVillageId: string;
    message?: string;
  } | null>(null);

  // Load Initial Session & Data
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    try {
      // Preload villages so registration and maps have data
      const villagesRes = await api.getVillages().catch(() => []);
      setVillages(villagesRes);

      const meRes = await api.getMe();
      setCurrentUser(meRes.user);
      setUserVillage(meRes.villageDetails);

      if (meRes.user.role === 'VILLAGE_HEAD' || meRes.user.role === 'MEMBER') {
        setCurrentView('my-village');
        setSelectedVillageId(meRes.user.village_id || null);
      } else {
        setCurrentView('dashboard');
      }

      await loadJurisdictionData();
    } catch (err: any) {
      console.log('No active session, prompting sign in:', err?.message || err);
      setCurrentUser(null);
      setShowAuthModal(true);
    } finally {
      setLoading(false);
    }
  };

  const loadJurisdictionData = async () => {
    try {
      const [statsRes, villagesRes, issuesRes, projectsRes, meetingsRes, visitsRes, notifsRes] = await Promise.all([
        api.getStats().catch(() => null),
        api.getVillages().catch(() => []),
        api.getIssues().catch(() => []),
        api.getProjects().catch(() => []),
        api.getMeetings().catch(() => []),
        api.getFieldVisits().catch(() => []),
        api.getNotifications().catch(() => [])
      ]);

      if (statsRes) setStats(statsRes);
      if (villagesRes.length > 0) setVillages(villagesRes);
      setIssues(issuesRes);
      setProjects(projectsRes);
      setMeetings(meetingsRes);
      setFieldVisits(visitsRes);
      setNotifications(notifsRes);
    } catch (err: any) {
      console.error('Data loading error:', err);
    }
  };

  const handleSignOut = () => {
    api.logout();
    setCurrentUser(null);
    setUserVillage(undefined);
    setSelectedVillageId(null);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    setShowAuthModal(false);
    if (user.role === 'VILLAGE_HEAD' || user.role === 'MEMBER') {
      setCurrentView('my-village');
      setSelectedVillageId(user.village_id || null);
    } else {
      setCurrentView('dashboard');
      setSelectedVillageId(null);
    }
    await loadJurisdictionData();
  };

  const handleSelectUser = async (userId: string) => {
    setLoading(true);
    setAccessDeniedViolation(null);
    try {
      await api.login(userId);
      const meRes = await api.getMe();
      setCurrentUser(meRes.user);
      setUserVillage(meRes.villageDetails);

      if (meRes.user.role === 'VILLAGE_HEAD' || meRes.user.role === 'MEMBER') {
        setCurrentView('my-village');
        setSelectedVillageId(meRes.user.village_id || null);
      } else {
        setCurrentView('dashboard');
        setSelectedVillageId(null);
      }

      await loadJurisdictionData();
    } catch (err: any) {
      console.error('User switch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLang = () => {
    setLang(prev => (prev === 'en' ? 'kn' : 'en'));
  };

  const handleMarkNotifRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const handleGlobalSearch = async (query: string) => {
    setSearchQuery(query);
    try {
      const res = await api.search(query);
      setSearchResults(res.results);
      setSearchModalOpen(true);
    } catch (err: any) {
      console.error('Search error:', err);
    }
  };

  const handleNavigate = (view: string) => {
    setAccessDeniedViolation(null);

    // Support direct village-profile routing (e.g. "village-profile:V_TUR01")
    if (view.startsWith('village-profile:')) {
      const targetVilId = view.split(':')[1];
      if (currentUser?.role === 'VILLAGE_HEAD' && targetVilId !== currentUser.village_id) {
        setAccessDeniedViolation({
          attemptedVillageId: targetVilId,
          message: 'Direct URL / action tampering detected. Village Head cannot open unauthorized village.'
        });
        return;
      }
      setSelectedVillageId(targetVilId);
      setCurrentView('villages');
      return;
    }

    // Role-based restrictions check
    if (currentUser?.role === 'VILLAGE_HEAD') {
      const forbiddenForVillageHead = ['gram-panchayats', 'booths', 'audit-logs', 'user-management', 'settings', 'map'];
      if (forbiddenForVillageHead.includes(view)) {
        setAccessDeniedViolation({
          attemptedVillageId: view,
          message: 'This module is restricted to Super Admin.'
        });
        return;
      }
    }

    if (currentUser?.role === 'MEMBER') {
      const forbiddenForMember = ['gram-panchayats', 'booths', 'audit-logs', 'user-management', 'settings', 'reports', 'map', 'team'];
      if (forbiddenForMember.includes(view)) {
        setAccessDeniedViolation({
          attemptedVillageId: view,
          message: 'This module is restricted to Village Head or Super Admin.'
        });
        return;
      }
    }

    if (view === 'villages' && (currentUser?.role === 'VILLAGE_HEAD' || currentUser?.role === 'MEMBER')) {
      setSelectedVillageId(currentUser.village_id || null);
    } else if (view === 'my-village') {
      setSelectedVillageId(currentUser?.village_id || null);
    }

    setCurrentView(view);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingState lang={lang} label="Connecting to Sindhanur AC-58 Constituency System..." />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col antialiased text-white selection:bg-amber-500 selection:text-white">
        {/* Top Header */}
        <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-sm">
              AC58
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-none">
                Constituency Connect
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Sindhanur AC-58 • Raichur District • Karnataka
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Register</span>
          </button>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <Landmark className="w-3.5 h-3.5" />
            Official Constituency Portal • 124 Villages
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Sindhanur AC-58 Constituency Portal
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            Welcome to the official digital platform for Sindhanur Assembly Constituency. Citizens can register their Voter ID / EPIC number to participate in village civic governance.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-lg transition-all"
            >
              Access Voter Registration & Sign In
            </button>
          </div>
        </main>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          lang={lang}
        />
      </div>
    );
  }

  const isVillageHead = currentUser.role === 'VILLAGE_HEAD';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Top Fixed Header Navbar */}
      <Navbar
        currentUser={currentUser}
        onSignOut={handleSignOut}
        lang={lang}
        onToggleLang={handleToggleLang}
        notifications={notifications}
        onMarkNotifRead={handleMarkNotifRead}
        onSearch={handleGlobalSearch}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        onOpenSecurityTests={() => setShowSecurityTests(true)}
        onNavigate={handleNavigate}
      />

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Desktop Left Navigation Sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            currentView={currentView}
            onNavigate={handleNavigate}
            role={currentUser.role}
            villageId={currentUser.village_id}
            villageName={userVillage?.village_name}
            lang={lang}
          />
        </div>

        {/* Mobile Flyout Sidebar Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative z-10 w-72 h-full bg-slate-900">
              <Sidebar
                currentView={currentView}
                onNavigate={handleNavigate}
                role={currentUser.role}
                villageId={currentUser.village_id}
                villageName={userVillage?.village_name}
                lang={lang}
                onCloseMobile={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">
          
          {/* Access Denied Shield if triggered */}
          {accessDeniedViolation ? (
            <AccessDeniedScreen
              lang={lang}
              attemptedVillageId={accessDeniedViolation.attemptedVillageId}
              userVillageId={currentUser.village_id || 'None'}
              message={accessDeniedViolation.message}
              onReset={() => {
                setAccessDeniedViolation(null);
                setCurrentView(isVillageHead ? 'my-village' : 'dashboard');
              }}
            />
          ) : (
            <>
              {/* Dynamic View Switcher */}
              {currentView === 'dashboard' && (
                stats ? (
                  <AdminDashboard
                    stats={stats}
                    issues={issues}
                    villages={villages}
                    lang={lang}
                    onNavigate={handleNavigate}
                    onOpenSecurityTests={() => setShowSecurityTests(true)}
                  />
                ) : (
                  <LoadingState lang={lang} label="Loading constituency dashboard metrics..." />
                )
              )}

              {currentView === 'my-village' && (
                stats ? (
                  <VillageHeadDashboard
                    stats={stats}
                    village={userVillage}
                    meetings={meetings}
                    fieldVisits={fieldVisits}
                    lang={lang}
                    onNavigate={handleNavigate}
                    onNewIssue={() => setCurrentView('issues')}
                  />
                ) : (
                  <LoadingState lang={lang} label="Loading village jurisdiction metrics..." />
                )
              )}

              {currentView === 'villages' && (
                <VillageManagement
                  currentUser={currentUser}
                  selectedVillageId={selectedVillageId}
                  lang={lang}
                  onNavigate={handleNavigate}
                  onSelectVillage={setSelectedVillageId}
                />
              )}

              {currentView === 'gram-panchayats' && (
                <GramPanchayatView
                  currentUser={currentUser}
                  lang={lang}
                  onNavigateToVillage={id => {
                    setSelectedVillageId(id);
                    setCurrentView('villages');
                  }}
                />
              )}

              {currentView === 'booths' && (
                <BoothManagement
                  currentUser={currentUser}
                  villages={villages}
                  lang={lang}
                />
              )}

              {currentView === 'team' && (
                <TeamManagement
                  currentUser={currentUser}
                  villages={villages}
                  lang={lang}
                />
              )}

              {currentView === 'issues' && (
                <IssueTracker
                  currentUser={currentUser}
                  villages={villages}
                  lang={lang}
                />
              )}

              {currentView === 'development' && (
                <DevelopmentProjects
                  currentUser={currentUser}
                  lang={lang}
                />
              )}

              {currentView === 'field-visits' && (
                <FieldVisits
                  currentUser={currentUser}
                  villages={villages}
                  lang={lang}
                />
              )}

              {currentView === 'meetings' && (
                <MeetingsView
                  currentUser={currentUser}
                  villages={villages}
                  lang={lang}
                />
              )}

              {currentView === 'video-conference' && (
                <JitsiConferenceList
                  currentUser={currentUser}
                  villages={villages}
                  lang={lang}
                />
              )}

              {currentView === 'tasks' && (
                <TaskManagement
                  currentUser={currentUser}
                  villages={villages}
                  lang={lang}
                />
              )}

              {currentView === 'documents' && (
                <DocumentsView
                  currentUser={currentUser}
                  villages={villages}
                  lang={lang}
                />
              )}

              {currentView === 'reports' && (
                <ReportsView
                  currentUser={currentUser}
                  villages={villages}
                  lang={lang}
                />
              )}

              {currentView === 'user-management' && (
                <UserManagement
                  currentUser={currentUser}
                  villages={villages}
                  lang={lang}
                  onRefreshData={loadJurisdictionData}
                />
              )}

              {currentView === 'audit-logs' && (
                <AuditLogView
                  currentUser={currentUser}
                  lang={lang}
                />
              )}

              {currentView === 'profile' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-xl space-y-4">
                  <h2 className="text-lg font-bold text-slate-900">{t('myProfile', lang)}</h2>
                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-400">Name:</span>
                      <span className="font-bold text-slate-900">{currentUser.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-400">Role:</span>
                      <span className="font-bold text-emerald-700">{currentUser.role}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-400">Assigned Village:</span>
                      <span className="font-mono font-bold text-slate-900">{currentUser.village_id || 'Constituency Wide'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-mono">{currentUser.mobile}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400">Email:</span>
                      <span>{currentUser.email}</span>
                    </div>
                  </div>
                </div>
              )}

              {currentView === 'settings' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-xl space-y-4">
                  <h2 className="text-lg font-bold text-slate-900">{t('settings', lang)}</h2>
                  <p className="text-xs text-slate-500">
                    Constituency Connect configuration for Sindhanur Assembly Constituency (AC-58), Raichur District, Karnataka.
                  </p>
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setShowSecurityTests(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                    >
                      Launch Section 31 RBAC Isolation Audit
                    </button>
                  </div>
                </div>
              )}

              {currentView === 'more-menu' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">All Modules & Portals</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button onClick={() => handleNavigate('development')} className="p-3 bg-slate-50 rounded-xl text-left font-semibold">Development</button>
                    <button onClick={() => handleNavigate('field-visits')} className="p-3 bg-slate-50 rounded-xl text-left font-semibold">Field Visits</button>
                    <button onClick={() => handleNavigate('tasks')} className="p-3 bg-slate-50 rounded-xl text-left font-semibold">Tasks</button>
                    <button onClick={() => handleNavigate('documents')} className="p-3 bg-slate-50 rounded-xl text-left font-semibold">Documents</button>
                    <button onClick={() => handleNavigate('reports')} className="p-3 bg-slate-50 rounded-xl text-left font-semibold">Reports</button>
                    <button onClick={() => handleNavigate('map')} className="p-3 bg-slate-50 rounded-xl text-left font-semibold">GIS Map</button>
                    {!isVillageHead && (
                      <>
                        <button onClick={() => handleNavigate('gram-panchayats')} className="p-3 bg-slate-50 rounded-xl text-left font-semibold">Gram Panchayats</button>
                        <button onClick={() => handleNavigate('booths')} className="p-3 bg-slate-50 rounded-xl text-left font-semibold">Booths</button>
                        <button onClick={() => handleNavigate('audit-logs')} className="p-3 bg-slate-50 rounded-xl text-left font-semibold">Audit Logs</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Section 25) */}
      <MobileNav
        currentView={currentView}
        onNavigate={handleNavigate}
        lang={lang}
        role={currentUser.role}
      />

      {/* Security Tester Modal (Section 31) */}
      {showSecurityTests && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <SecurityTester
            lang={lang}
            onClose={() => setShowSecurityTests(false)}
            onSwitchUser={id => {
              handleSelectUser(id);
              setShowSecurityTests(false);
            }}
          />
        </div>
      )}

      {/* Global Search Modal */}
      {searchModalOpen && searchResults && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Search Results for "{searchQuery}"
                </h3>
              </div>
              <button
                onClick={() => setSearchModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Villages */}
              {searchResults.villages?.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">Villages</h4>
                  <div className="space-y-1.5">
                    {searchResults.villages.map((v: any) => (
                      <div
                        key={v.village_id}
                        onClick={() => {
                          setSearchModalOpen(false);
                          handleNavigate(`village-profile:${v.village_id}`);
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer flex justify-between items-center"
                      >
                        <span className="font-semibold text-slate-900">{v.village_name}</span>
                        <span className="font-mono text-slate-400">{v.village_id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              {searchResults.issues?.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">Issues</h4>
                  <div className="space-y-1.5">
                    {searchResults.issues.map((i: any) => (
                      <div
                        key={i.issue_id}
                        onClick={() => {
                          setSearchModalOpen(false);
                          setCurrentView('issues');
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <span className="font-semibold text-slate-900 block">{i.title}</span>
                          <span className="text-[10px] text-slate-500">{i.village_id} • {i.category}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {i.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {searchResults.projects?.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">Projects</h4>
                  <div className="space-y-1.5">
                    {searchResults.projects.map((p: any) => (
                      <div
                        key={p.project_id}
                        onClick={() => {
                          setSearchModalOpen(false);
                          setCurrentView('development');
                        }}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <span className="font-semibold text-slate-900 block">{p.project_name}</span>
                          <span className="text-[10px] text-slate-500">{p.village_id} • {p.department}</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700">
                          {p.progress_percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.villages?.length === 0 && searchResults.issues?.length === 0 && searchResults.projects?.length === 0 && (
                <p className="text-center text-slate-400 py-6">
                  No records found matching "{searchQuery}".
                </p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

