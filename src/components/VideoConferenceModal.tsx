import React, { useState, useEffect } from 'react';
import { getVillageName } from "../utils/villageName";import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Hand,
  Users,
  Share2,
  Shield,
  MessageSquare,
  AlertCircle,
  Crown,
  Volume2,
  Send,
  Radio,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { VideoMeeting, VideoParticipant, User } from '../types.ts';
import { getVillageName } from "../utils/villageName";import { api } from '../services/api.ts';
import { getVillageName } from "../utils/villageName";
interface VideoConferenceModalProps {
  meetingId: string;
  currentUser: User;
  onClose: () => void;
}

export const VideoConferenceModal: React.FC<VideoConferenceModalProps> = ({
  meetingId,
  currentUser,
  onClose
}) => {
  const [meeting, setMeeting] = useState<VideoMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local device states
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<'video' | 'participants' | 'chat'>('video');

  // Chat message state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; role: string; text: string; time: string }>>([
    {
      sender: 'System',
      role: 'SYSTEM',
      text: 'Encrypted village video conference channel established. Access strictly restricted to authorized village stakeholders.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [newMsg, setNewMsg] = useState('');

  const isHost = currentUser.role === 'VILLAGE_HEAD' && meeting?.village_id === currentUser.village_id;

  useEffect(() => {
    joinAndLoad();

    // Poll meeting state every 3 seconds for live participants and status updates
    const interval = setInterval(() => {
      refreshMeeting();
    }, 3000);

    return () => {
      clearInterval(interval);
      api.leaveVideoMeeting(meetingId).catch(() => {});
    };
  }, [meetingId]);

  const joinAndLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.joinVideoMeeting(meetingId);
      setMeeting(data);
      const myParticipant = data.participants?.find(p => p.user_id === currentUser.user_id);
      if (myParticipant) {
        setIsMuted(myParticipant.is_muted);
        setIsHandRaised(myParticipant.is_hand_raised);
        setIsVideoEnabled(myParticipant.is_video_enabled);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join video meeting');
    } finally {
      setLoading(false);
    }
  };

  const refreshMeeting = async () => {
    try {
      const data = await api.getVideoMeetingById(meetingId);
      setMeeting(data);
    } catch (err) {
      // Ignored for polling
    }
  };

  const toggleMute = async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      const updated = await api.updateParticipantState(meetingId, currentUser.user_id, {
        is_muted: nextMuted
      });
      setMeeting(updated);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleVideo = async () => {
    const nextVideo = !isVideoEnabled;
    setIsVideoEnabled(nextVideo);
    try {
      const updated = await api.updateParticipantState(meetingId, currentUser.user_id, {
        is_video_enabled: nextVideo
      });
      setMeeting(updated);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleHandRaise = async () => {
    const nextHand = !isHandRaised;
    setIsHandRaised(nextHand);
    try {
      const updated = await api.updateParticipantState(meetingId, currentUser.user_id, {
        is_hand_raised: nextHand
      });
      setMeeting(updated);
      if (nextHand) {
        setChatMessages(prev => [
          ...prev,
          {
            sender: currentUser.name,
            role: currentUser.role,
            text: '✋ Raised hand to request speaking turn.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleHostEndMeeting = async () => {
    if (!confirm('Are you sure you want to end this video conference for all participants?')) return;
    try {
      await api.updateVideoMeetingStatus(meetingId, 'ENDED');
      onClose();
    } catch (err: any) {
      alert(`Failed to end conference: ${err.message}`);
    }
  };

  const handleHostToggleSpeakingPermission = async (participantUserId: string, currentCanSpeak: boolean) => {
    if (!isHost) return;
    try {
      const updated = await api.updateParticipantState(meetingId, participantUserId, {
        can_speak: !currentCanSpeak,
        is_muted: currentCanSpeak ? true : false
      });
      setMeeting(updated);
    } catch (err: any) {
      alert(`Failed to toggle speaking permission: ${err.message}`);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setChatMessages(prev => [
      ...prev,
      {
        sender: currentUser.name,
        role: currentUser.role,
        text: newMsg.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setNewMsg('');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-8 max-w-md w-full text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
          <h3 className="font-bold text-base">Joining Secure Village Video Conference</h3>
          <p className="text-xs text-slate-400">Verifying session permissions for {currentUser.name}...</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-red-900/60 text-white rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-red-900/40 text-red-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-red-400">Access Denied / Conference Error</h3>
          <p className="text-xs text-slate-300 leading-relaxed">{error || 'Conference session not found.'}</p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const participants = meeting.participants || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden text-white animate-in fade-in">
      {/* Conference Header Bar */}
      <header className="h-16 px-4 md:px-6 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Radio className="w-3.5 h-3.5" />
              LIVE CONFERENCE
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div>
            <h2 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {meeting.title}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="font-mono text-emerald-400 font-semibold">{getVillageName(meeting.village_id)}</span>
              <span>•</span>
              <span>Host: Village Head</span>
            </div>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2">
          {isHost && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
              <Crown className="w-3 h-3 text-amber-400" />
              HOST MODE
            </span>
          )}

          <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/60">
            <button
              onClick={() => setActiveTab('video')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'video' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Stage ({participants.length})
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'participants' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Members
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'chat' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Chat
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* Main Video & Content Canvas */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Main Stage Grid */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col justify-center">
          <div className={`grid gap-4 max-w-6xl mx-auto w-full ${
            participants.length === 1 ? 'grid-cols-1 max-w-2xl' :
            participants.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            participants.length <= 4 ? 'grid-cols-1 sm:grid-cols-2' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {participants.map(p => {
              const isMe = p.user_id === currentUser.user_id;
              const isParticipantHost = p.role === 'VILLAGE_HEAD';

              return (
                <div
                  key={p.user_id}
                  className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col items-center justify-center p-4 group"
                >
                  {/* Subtle video background gradient animation */}
                  <div className="absolute inset-0 bg-radial from-emerald-950/20 via-transparent to-transparent opacity-50" />

                  {/* Avatar or Simulated Video Stream */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="relative">
                      <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-xl font-bold border-2 transition-all ${
                        !p.is_muted ? 'border-emerald-500 shadow-lg shadow-emerald-500/20 scale-105' : 'border-slate-700 bg-slate-800'
                      } ${isParticipantHost ? 'bg-amber-950/40 text-amber-300' : 'bg-slate-800 text-slate-200'}`}>
                        {p.name.charAt(0)}
                      </div>

                      {/* Speaking indicator wave */}
                      {!p.is_muted && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-emerald-500 text-[9px] font-black px-2 py-0.5 rounded-full text-slate-950 flex items-center gap-1">
                          <Volume2 className="w-2.5 h-2.5 animate-pulse" />
                          SPEAKING
                        </div>
                      )}

                      {/* Hand Raised indicator */}
                      {p.is_hand_raised && (
                        <div className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 text-xs p-1.5 rounded-full shadow-lg animate-bounce">
                          <Hand className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <p className="mt-3 font-semibold text-sm text-slate-200 text-center truncate max-w-[200px]">
                      {p.name} {isMe && '(You)'}
                    </p>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {p.role}
                    </span>
                  </div>

                  {/* Tile Overlay Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                    {isParticipantHost ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                        <Crown className="w-3 h-3" /> Village Head Host
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] font-medium">
                        Village Member
                      </span>
                    )}
                  </div>

                  {/* Audio/Video status icons in bottom corner */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
                    <div className={`p-1.5 rounded-lg text-xs ${
                      p.is_muted ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}>
                      {p.is_muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Host Quick Controls on Hover (for Village Head only) */}
                  {isHost && !isMe && (
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-slate-900/90 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                      <button
                        onClick={() => handleHostToggleSpeakingPermission(p.user_id, p.can_speak)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                          p.can_speak ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {p.can_speak ? 'Mute/Revoke Turn' : 'Grant Speaking Turn'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Panel for Participants or Chat */}
        {activeTab !== 'video' && (
          <aside className="w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 animate-in slide-in-from-right duration-200">
            {activeTab === 'participants' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Village Attendees ({participants.length})
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">{getVillageName(meeting.village_id)}</span>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2">
                  {participants.map(p => (
                    <div key={p.user_id} className="p-3 flex items-center justify-between hover:bg-slate-800/40 rounded-xl transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold">
                          {p.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">
                            {p.name} {p.user_id === currentUser.user_id && '(You)'}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span>{p.role}</span>
                            {p.is_hand_raised && <span className="text-amber-400 font-bold">✋ Hand Raised</span>}
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5">
                        {isHost && p.user_id !== currentUser.user_id && (
                          <button
                            onClick={() => handleHostToggleSpeakingPermission(p.user_id, p.can_speak)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 rounded border border-slate-700"
                          >
                            {p.can_speak ? 'Mute' : 'Allow'}
                          </button>
                        )}
                        <div className={`p-1.5 rounded-lg text-xs ${p.is_muted ? 'text-red-400' : 'text-emerald-400'}`}>
                          {p.is_muted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-800">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    Village Meeting Notes & Chat
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className="space-y-0.5 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-emerald-400">{msg.sender} ({msg.role})</span>
                        <span>{msg.time}</span>
                      </div>
                      <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/50 text-slate-200">
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    placeholder="Type message to village participants..."
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Conference Bottom Control Deck */}
      <footer className="h-20 px-6 bg-slate-900/95 border-t border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Sindhanur AC-58 Civic Security Layer Active</span>
        </div>

        {/* Center Meeting Controls */}
        <div className="flex items-center gap-3 mx-auto">
          {/* Mute Toggle */}
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all ${
              isMuted ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-emerald-400" />}
            <span className="hidden md:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all ${
              !isVideoEnabled ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {!isVideoEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5 text-emerald-400" />}
            <span className="hidden md:inline">{isVideoEnabled ? 'Stop Video' : 'Start Video'}</span>
          </button>

          {/* Raise Hand */}
          <button
            onClick={toggleHandRaise}
            className={`p-3.5 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all ${
              isHandRaised ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Hand className={`w-5 h-5 ${isHandRaised ? 'text-white' : 'text-amber-400'}`} />
            <span className="hidden md:inline">{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
          </button>

          {/* Screen Share */}
          <button
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`p-3.5 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all ${
              isScreenSharing ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Share2 className="w-5 h-5" />
            <span className="hidden md:inline">Share Screen</span>
          </button>
        </div>

        {/* Right Controls: End Meeting for Host */}
        <div className="flex items-center gap-3">
          {isHost ? (
            <button
              onClick={handleHostEndMeeting}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center gap-1.5"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End For All</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all"
            >
              Leave
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

