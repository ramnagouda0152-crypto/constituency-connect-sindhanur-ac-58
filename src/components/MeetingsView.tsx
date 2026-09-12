import React, { useState, useEffect } from 'react';
import { getVillageName } from "../utils/villageName";import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Users,
  CheckCircle2,
  FileText,
  Video,
  Radio,
  Shield,
  Crown,
  AlertTriangle,
  Play,
  Lock
} from 'lucide-react';
import { VillageMeeting, VideoMeeting, User as UserType, Village } from '../types.ts';
import { getVillageName } from "../utils/villageName";import { api } from '../services/api.ts';
import { getVillageName } from "../utils/villageName";import { Language, t } from '../translations.ts';
import { getVillageName } from "../utils/villageName";import { VideoConferenceModal } from './VideoConferenceModal.tsx';
import { getVillageName } from "../utils/villageName";
interface MeetingsViewProps {
  currentUser: UserType;
  villages: Village[];
  lang: Language;
}

export const MeetingsView: React.FC<MeetingsViewProps> = ({ currentUser, villages, lang }) => {
  const [meetingTab, setMeetingTab] = useState<'video' | 'in_person'>('video');
  const [inPersonMeetings, setInPersonMeetings] = useState<VillageMeeting[]>([]);
  const [videoMeetings, setVideoMeetings] = useState<VideoMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  // Active conference modal state
  const [activeVideoMeetingId, setActiveVideoMeetingId] = useState<string | null>(null);

  // In-person meeting modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('11:00 AM');
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState('');
  const [villageId, setVillageId] = useState(currentUser.village_id || 'V_GOR01');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Video meeting creation modal (Village Head ONLY)
  const [showCreateVideoModal, setShowCreateVideoModal] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoScheduledAt, setVideoScheduledAt] = useState('');
  const [videoType, setVideoType] = useState('VILLAGE_MEETING');
  const [startNow, setStartNow] = useState(true);
  const [isCreatingVideo, setIsCreatingVideo] = useState(false);
  const [videoCreationError, setVideoCreationError] = useState<string | null>(null);

  const isVillageHead = currentUser.role === 'VILLAGE_HEAD';

  useEffect(() => {
    loadAllMeetings();
  }, [currentUser]);

  const loadAllMeetings = async () => {
    setLoading(true);
    try {
      const [inPerson, video] = await Promise.all([
        api.getMeetings(),
        api.getVideoMeetings()
      ]);
      setInPersonMeetings(inPerson);
      setVideoMeetings(video);
    } catch (err: any) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInPersonMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !location) return;
    setIsSubmitting(true);
    try {
      const targetVillage = isVillageHead ? (currentUser.village_id || 'V_GOR01') : villageId;
      await api.createMeeting({
        title,
        date,
        time,
        location,
        agenda,
        village_id: targetVillage,
        status: 'SCHEDULED',
        attendees: 20
      });
      setShowScheduleModal(false);
      setTitle('');
      setDate('');
      setAgenda('');
      setLocation('');
      loadAllMeetings();
    } catch (err: any) {
      alert(`Failed to schedule meeting: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVideoMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVillageHead) {
      setVideoCreationError('Security Violation: Only Village Heads can create video conferences.');
      return;
    }
    if (!videoTitle.trim()) return;

    setIsCreatingVideo(true);
    setVideoCreationError(null);
    try {
      const created = await api.createVideoMeeting({
        title: videoTitle.trim(),
        description: videoDescription.trim(),
        scheduled_at: videoScheduledAt || new Date().toISOString(),
        meeting_type: videoType,
        allow_screen_share: true,
        start_now: startNow
      });

      setShowCreateVideoModal(false);
      setVideoTitle('');
      setVideoDescription('');
      setVideoScheduledAt('');
      loadAllMeetings();

      // If started immediately, open stage modal right away
      if (startNow) {
        setActiveVideoMeetingId(created.meeting_id);
      }
    } catch (err: any) {
      setVideoCreationError(err.message || 'Failed to create video conference');
    } finally {
      setIsCreatingVideo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('meetings', lang)}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isVillageHead
              ? `Video conferences & Gram Sabhe meetings for ${getVillageName(currentUser.village_id)}`
              : 'Constituency civic meeting agendas, digital conferences, and assemblies'}
          </p>
        </div>

        {/* View Selection Tabs */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center">
            <button
              onClick={() => setMeetingTab('video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                meetingTab === 'video'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Video className="w-3.5 h-3.5 text-emerald-600" />
              <span>Video Conferences ({videoMeetings.length})</span>
            </button>
            <button
              onClick={() => setMeetingTab('in_person')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                meetingTab === 'in_person'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>In-Person Gram Sabhe ({inPersonMeetings.length})</span>
            </button>
          </div>

          {/* Action Button depending on tab and role */}
          {meetingTab === 'video' ? (
            isVillageHead ? (
              <button
                onClick={() => setShowCreateVideoModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Start Video Conference</span>
              </button>
            ) : (
              <div
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-600"
                title="Only Village Heads can host or create video conferences"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Village Head Exclusive Hosting</span>
              </div>
            )
          ) : (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Gram Sabhe</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIDEO CONFERENCES TAB                                   */}
      {/* ======================================================== */}
      {meetingTab === 'video' && (
        <div className="space-y-4">
          {/* Role Guidance Banner */}
          {!isVillageHead && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-900">
                <span className="font-bold">Role Access Constraint: </span>
                Under AC-58 Governance Security Rules, only the assigned <span className="font-semibold underline">Village Head</span> has authorization to create, schedule, and host video conferences for their village. Members may view and join live sessions within their assigned village.
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-xs text-slate-400 py-6 text-center">Loading video conferences...</p>
          ) : videoMeetings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Active Video Conferences</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isVillageHead
                  ? 'As Village Head, you can initiate an encrypted video conference with village members and community committees.'
                  : 'No scheduled video conference has been initiated by the Village Head for this jurisdiction yet.'}
              </p>
              {isVillageHead && (
                <button
                  onClick={() => setShowCreateVideoModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  Create Video Meeting
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videoMeetings.map(vm => {
                const isLive = vm.status === 'LIVE';
                const isHostOfMeeting = currentUser.role === 'VILLAGE_HEAD' && currentUser.village_id === vm.village_id;

                return (
                  <div
                    key={vm.meeting_id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs space-y-3 transition-all ${
                      isLive ? 'border-emerald-300 ring-1 ring-emerald-500/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Top Badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isLive ? (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            LIVE NOW
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            vm.status === 'SCHEDULED' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {vm.status}
                          </span>
                        )}
                        <span className="font-mono text-[11px] font-semibold text-slate-400">{vm.meeting_id}</span>
                      </div>

                      <span className="font-mono text-emerald-700 text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {getVillageName(vm.village_id)}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{vm.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {vm.description || 'Village council conference.'}
                      </p>
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(vm.scheduled_at).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(vm.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{vm.participants?.length || 0} participants</span>
                      </span>
                    </div>

                    {/* Host & Actions Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Crown className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-medium text-[11px]">
                          Host: {isHostOfMeeting ? 'You (Village Head)' : 'Village Head'}
                        </span>
                      </div>

                      {vm.status !== 'ENDED' && (
                        <button
                          onClick={() => setActiveVideoMeetingId(vm.meeting_id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                            isLive
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{isLive ? 'Join Live Stage' : 'Enter Conference'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* IN-PERSON MEETINGS TAB                                   */}
      {/* ======================================================== */}
      {meetingTab === 'in_person' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <p className="text-xs text-slate-400 py-6 text-center col-span-2">Loading meetings...</p>
          ) : inPersonMeetings.length === 0 ? (
            <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
              No in-person meetings recorded in this jurisdiction.
            </div>
          ) : (
            inPersonMeetings.map(m => (
              <div key={m.meeting_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-500">{m.meeting_id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                    m.status === 'SCHEDULED' ? 'bg-purple-100 text-purple-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{m.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{m.date}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{m.time}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{m.location}</span>
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1.5">
                  <div>
                    <span className="font-semibold text-slate-700 block mb-0.5">Agenda:</span>
                    <p className="text-slate-600 leading-relaxed">{m.agenda}</p>
                  </div>
                  {m.decisions && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="font-semibold text-emerald-800 block mb-0.5">Decisions Taken:</span>
                      <p className="text-slate-700 leading-relaxed">{m.decisions}</p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{m.attendees} community attendees</span>
                  </span>
                  <span className="font-mono text-emerald-700 font-semibold">{getVillageName(m.village_id)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ACTIVE VIDEO CONFERENCE MODAL STAGE                     */}
      {/* ======================================================== */}
      {activeVideoMeetingId && (
        <VideoConferenceModal
          meetingId={activeVideoMeetingId}
          currentUser={currentUser}
          onClose={() => {
            setActiveVideoMeetingId(null);
            loadAllMeetings();
          }}
        />
      )}

      {/* ======================================================== */}
      {/* CREATE VIDEO MEETING MODAL (VILLAGE HEAD EXCLUSIVE)     */}
      {/* ======================================================== */}
      {showCreateVideoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Village Head Security Protocol</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Initiate Village Video Conference</h3>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono text-xs font-bold">
                {currentUser.village_id}
              </span>
            </div>

            {videoCreationError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {videoCreationError}
              </div>
            )}

            <form onSubmit={handleCreateVideoMeeting} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Conference Title</label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  placeholder="e.g. Gorebal Ward 3 Water Distribution Review"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Agenda / Description</label>
                <textarea
                  rows={2}
                  value={videoDescription}
                  onChange={e => setVideoDescription(e.target.value)}
                  placeholder="Briefly state purpose and expected decisions..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Conference Type</label>
                  <select
                    value={videoType}
                    onChange={e => setVideoType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="VILLAGE_MEETING">Village Council Meet</option>
                    <option value="EMERGENCY_SYNC">Emergency Civic Sync</option>
                    <option value="GRIEVANCE_SESSION">Public Grievance Hearing</option>
                    <option value="COMMITTEE_SYNC">Ward Committee Sync</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Option</label>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="startNowCheck"
                      checked={startNow}
                      onChange={e => setStartNow(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="startNowCheck" className="text-slate-700 font-medium">
                      Start Live Immediately
                    </label>
                  </div>
                </div>
              </div>

              {!startNow && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scheduled Date & Time</label>
                  <input
                    type="datetime-local"
                    value={videoScheduledAt}
                    onChange={e => setVideoScheduledAt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
                <span className="font-semibold text-slate-900 block mb-0.5">Jurisdiction Lock:</span>
                This conference will be assigned exclusively to your village (
                <span className="font-mono font-bold text-emerald-700">{currentUser.village_id}</span>
                ). Super Admin and other village heads cannot alter or commandeer this conference.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateVideoModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingVideo}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{isCreatingVideo ? 'Starting...' : startNow ? 'Launch Conference Stage' : 'Schedule Conference'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SCHEDULE IN-PERSON MEETING MODAL                         */}
      {/* ======================================================== */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Schedule In-Person Gram Sabhe</h3>
            <p className="text-xs text-slate-500 mb-4">Plan physical meeting or village committee discussion</p>

            <form onSubmit={handleScheduleInPersonMeeting} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Meeting Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Ward 2 Drinking Water Committee Meet"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="text"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    placeholder="10:30 AM"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Meeting Location</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Gram Panchayat Office Hall"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              {!isVillageHead && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Village</label>
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
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Discussion Agenda</label>
                <textarea
                  required
                  rows={3}
                  value={agenda}
                  onChange={e => setAgenda(e.target.value)}
                  placeholder="Key topics to discuss with village residents..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Schedule Meeting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

