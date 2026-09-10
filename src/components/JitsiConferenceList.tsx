import React, { useState, useEffect } from 'react';
import {
  Video,
  Calendar,
  Clock,
  Users,
  Plus,
  Radio,
  Shield,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  PhoneCall,
  UserCheck,
  Building2,
  Lock
} from 'lucide-react';
import { Conference, User, Village } from '../types.ts';
import { api } from '../services/api.ts';
import { Language } from '../translations.ts';
import { JitsiConferenceRoom } from './JitsiConferenceRoom.tsx';

interface JitsiConferenceListProps {
  currentUser: User;
  villages: Village[];
  lang?: Language;
}

interface VillageMember {
  user_id: string;
  name: string;
  mobile: string;
  role: string;
}

export const JitsiConferenceList: React.FC<JitsiConferenceListProps> = ({
  currentUser,
  villages
}) => {
  const [conferences, setConferences] = useState<Conference[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'LIVE' | 'SCHEDULED' | 'ENDED'>('ALL');

  // Active video call state
  const [activeCall, setActiveCall] = useState<{
    conference: Conference;
    jitsiRoomName: string;
  } | null>(null);

  // Schedule Conference Modal (Village Head only)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [villageMembers, setVillageMembers] = useState<VillageMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Schedule Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [formTime, setFormTime] = useState('11:00');
  const [formDuration, setFormDuration] = useState<number>(30);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const isVillageHead = currentUser.role === 'VILLAGE_HEAD';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isMember = currentUser.role === 'MEMBER';

  // Lookup village name
  const currentVillageName = villages.find(v => v.village_id === currentUser.village_id)?.village_name || currentUser.village_id || 'Constituency Wide';

  useEffect(() => {
    loadConferences();
  }, [currentUser]);

  const loadConferences = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.getConferences();
      setConferences(data);
    } catch (err: any) {
      console.error('Failed to load conferences:', err);
      setError(err.message || 'Unable to retrieve video conferences.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const openScheduleModal = async () => {
    setShowScheduleModal(true);
    setFormError(null);
    setFormSuccess(null);
    setSelectedMemberIds([]);
    setFormTitle('');
    setFormDescription('');

    if (isVillageHead) {
      setLoadingMembers(true);
      try {
        const members = await api.getConferenceVillageMembers();
        setVillageMembers(members);
      } catch (err: any) {
        console.error('Failed to load village members:', err);
        setFormError('Unable to load village members.');
      } finally {
        setLoadingMembers(false);
      }
    }
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllMembers = () => {
    if (selectedMemberIds.length === villageMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(villageMembers.map(m => m.user_id));
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formTitle.trim()) {
      setFormError('Please enter a conference title.');
      return;
    }
    if (!formDate || !formTime) {
      setFormError('Please select both a date and time.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createConference({
        title: formTitle.trim(),
        description: formDescription.trim(),
        scheduled_date: formDate,
        scheduled_time: formTime,
        duration: formDuration,
        participant_user_ids: selectedMemberIds
      });

      setFormSuccess('Video conference scheduled and invited village members notified!');
      setTimeout(() => {
        setShowScheduleModal(false);
        loadConferences();
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || 'Failed to schedule video conference.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (conference: Conference) => {
    setError(null);
    try {
      const res = await api.joinConference(conference.id);
      setActiveCall({
        conference: res.conference,
        jitsiRoomName: res.jitsi_room_name
      });
    } catch (err: any) {
      setError(err.message || 'Failed to join video conference.');
    }
  };

  const filteredConferences = conferences.filter(c => {
    if (activeTab === 'LIVE') return c.status === 'Live';
    if (activeTab === 'SCHEDULED') return c.status === 'Scheduled';
    if (activeTab === 'ENDED') return c.status === 'Ended';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* If active conference room is open, render Jitsi meeting inside app */}
      {activeCall && (
        <JitsiConferenceRoom
          conference={activeCall.conference}
          jitsiRoomName={activeCall.jitsiRoomName}
          currentUser={currentUser}
          onLeave={() => {
            setActiveCall(null);
            loadConferences();
          }}
          onEnded={() => {
            setActiveCall(null);
            loadConferences();
          }}
        />
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Video Conferences
                </h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Jitsi Meet
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Secure constituency video conferences powered by Jitsi Meet.
                {isVillageHead && ` Restricted to your assigned village: ${currentVillageName}.`}
                {isMember && ` Viewing conferences for your registered village: ${currentVillageName}.`}
                {isSuperAdmin && ' Super Admin view for all constituency village conferences.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            id="refresh-conferences-btn"
            onClick={() => loadConferences(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            title="Refresh Conferences"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Schedule Conference Button: Village Head ONLY */}
          {isVillageHead && (
            <button
              id="open-schedule-conference-modal"
              onClick={openScheduleModal}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Conference</span>
            </button>
          )}
        </div>
      </div>

      {/* Role & Permissions Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-800">
            {isSuperAdmin && 'Super Admin Mode:'}
            {isVillageHead && `Village Head Jurisdiction (${currentVillageName}):`}
            {isMember && `Village Member Access (${currentVillageName}):`}
          </span>
          <span>
            {isSuperAdmin && 'Can view and join any village conference in Sindhanur AC-58.'}
            {isVillageHead && 'You can schedule conferences and invite members belonging exclusively to your village.'}
            {isMember && 'You can view and join scheduled video conferences in your village.'}
          </span>
        </div>
        <div className="text-slate-500 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" />
          <span>Zero external third-party keys required</span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-700 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="flex-1 font-medium">{error}</p>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {(['ALL', 'LIVE', 'SCHEDULED', 'ENDED'] as const).map(tab => (
          <button
            key={tab}
            id={`tab-conference-${tab.toLowerCase()}`}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === tab
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab === 'ALL' && `All Conferences (${conferences.length})`}
            {tab === 'LIVE' && `Live (${conferences.filter(c => c.status === 'Live').length})`}
            {tab === 'SCHEDULED' && `Upcoming (${conferences.filter(c => c.status === 'Scheduled').length})`}
            {tab === 'ENDED' && `Past (${conferences.filter(c => c.status === 'Ended').length})`}
          </button>
        ))}
      </div>

      {/* Conference Cards List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs">Loading video conferences...</p>
        </div>
      ) : filteredConferences.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">No Conferences Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {isVillageHead
              ? 'No video conferences scheduled yet for your village. Click "Schedule Conference" to invite members.'
              : 'There are no conferences currently scheduled for your village.'}
          </p>
          {isVillageHead && (
            <button
              onClick={openScheduleModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule First Conference</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConferences.map(conf => {
            const isLive = conf.status === 'Live';
            const isEnded = conf.status === 'Ended';
            const canJoin = !isEnded;

            return (
              <div
                key={conf.id}
                id={`conference-card-${conf.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  {/* Top Status row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isLive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isEnded
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {isLive && <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />}
                      <span>{conf.status}</span>
                    </span>

                    <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {conf.duration} mins
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 mb-1 leading-snug line-clamp-2">
                    {conf.title}
                  </h3>
                  {conf.description && (
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                      {conf.description}
                    </p>
                  )}

                  {/* Metadata List */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 rounded-xl p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> Village:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {conf.village_name || conf.village_id}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Date:
                      </span>
                      <span className="font-medium text-slate-800">
                        {conf.scheduled_date} at {conf.scheduled_time}
                      </span>
                    </div>

                    {conf.created_by_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" /> Host:
                        </span>
                        <span className="font-medium text-slate-800">
                          {conf.created_by_name}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Invited:
                      </span>
                      <span className="font-medium text-slate-800">
                        {conf.participants_count || 1} members
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {isEnded ? 'Concluded' : isLive ? 'Meeting in progress' : 'Ready to join'}
                  </span>

                  {canJoin ? (
                    <button
                      id={`join-conference-${conf.id}`}
                      onClick={() => handleJoin(conf)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                        isLive
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Join Conference</span>
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-medium">
                      Concluded
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Conference Modal (Village Head ONLY) */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Schedule Video Conference
                  </h3>
                  <p className="text-xs text-slate-500">
                    Village: <span className="font-bold text-slate-800">{currentVillageName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4 mt-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Conference Title *
                </label>
                <input
                  id="conf-title-input"
                  type="text"
                  required
                  placeholder="e.g. Village Drinking Water Grievance Review"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Agenda (Optional)
                </label>
                <textarea
                  id="conf-desc-input"
                  rows={2}
                  placeholder="Brief agenda of discussion..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date *
                  </label>
                  <input
                    id="conf-date-input"
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Time *
                  </label>
                  <input
                    id="conf-time-input"
                    type="time"
                    required
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Duration
                  </label>
                  <select
                    id="conf-duration-select"
                    value={formDuration}
                    onChange={e => setFormDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                    <option value={90}>90 mins</option>
                  </select>
                </div>
              </div>

              {/* Village Member Multi-Select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Invite Village Members ({selectedMemberIds.length} selected)
                  </label>
                  {villageMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllMembers}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      {selectedMemberIds.length === villageMembers.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5 bg-slate-50">
                  {loadingMembers ? (
                    <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Loading registered members of {currentVillageName}...</span>
                    </div>
                  ) : villageMembers.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">
                      No active members registered in this village yet. Members can join via their dashboard once registered.
                    </p>
                  ) : (
                    villageMembers.map(m => {
                      const isSelected = selectedMemberIds.includes(m.user_id);
                      return (
                        <label
                          key={m.user_id}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${
                            isSelected
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleMember(m.user_id)}
                              className="rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>{m.name}</span>
                          </div>
                          <span className="font-mono text-slate-400 text-xs">
                            {m.mobile}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Invited members will receive an in-app meeting notification and conference link.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-schedule-conference-btn"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                  <span>Schedule & Notify Members</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
