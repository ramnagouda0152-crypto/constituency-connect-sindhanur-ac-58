import React, { useEffect, useRef, useState } from 'react';
import {
  PhoneOff,
  PowerOff,
  Users,
  Shield,
  Clock,
  Radio,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Conference, User } from '../types.ts';
import { api } from '../services/api.ts';

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

interface JitsiConferenceRoomProps {
  conference: Conference;
  jitsiRoomName: string;
  currentUser: User;
  onLeave: () => void;
  onEnded?: () => void;
}

export const JitsiConferenceRoom: React.FC<JitsiConferenceRoomProps> = ({
  conference,
  jitsiRoomName,
  currentUser,
  onLeave,
  onEnded
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Village Head can end conference if it is their village conference
  const canEndConference = currentUser.role === 'VILLAGE_HEAD' && currentUser.village_id === conference.village_id;

  useEffect(() => {
    let isMounted = true;

    const loadScriptAndInit = async () => {
      try {
        if (!window.JitsiMeetExternalAPI) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector('script[src="https://meet.jit.si/external_api.js"]');
            if (existing) {
              existing.addEventListener('load', () => resolve());
              existing.addEventListener('error', () => reject(new Error('Failed to load Jitsi Meet script')));
              return;
            }
            const script = document.createElement('script');
            script.src = 'https://meet.jit.si/external_api.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Jitsi Meet script'));
            document.head.appendChild(script);
          });
        }

        if (!isMounted || !containerRef.current) return;

        // Clean any leftover elements in the container
        containerRef.current.innerHTML = '';

        const domain = 'meet.jit.si';
        const options = {
          roomName: jitsiRoomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: {
            displayName: `${currentUser.name} (${currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : currentUser.role === 'VILLAGE_HEAD' ? 'Village Head' : 'Member'})`,
            email: currentUser.email || `${currentUser.mobile}@sindhanur-ac58.gov.in`
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
            enableClosePage: false,
            toolbarButtons: [
              'camera',
              'chat',
              'closedcaptions',
              'desktop',
              'fullscreen',
              'fodeviceselection',
              'hangup',
              'microphone',
              'mute-everyone',
              'participants-pane',
              'profile',
              'raisehand',
              'recording',
              'security',
              'select-background',
              'settings',
              'shitemplates',
              'tileview',
              'toggle-camera',
              'videoquality'
            ]
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            DEFAULT_REMOTE_DISPLAY_NAME: 'Village Participant',
            TOOLBAR_ALWAYS_VISIBLE: true
          }
        };

        const apiInstance = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = apiInstance;

        apiInstance.addEventListener('readyToClose', () => {
          handleLeave();
        });

        apiInstance.addEventListener('videoConferenceLeft', () => {
          handleLeave();
        });

        setLoading(false);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to initialize Jitsi video conference');
          setLoading(false);
        }
      }
    };

    loadScriptAndInit();

    return () => {
      isMounted = false;
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {
          // ignore cleanup error
        }
        jitsiApiRef.current = null;
      }
    };
  }, [jitsiRoomName]);

  const handleLeave = async () => {
    try {
      await api.leaveConference(conference.id);
    } catch {
      // Ignored
    }
    if (jitsiApiRef.current) {
      try {
        jitsiApiRef.current.dispose();
      } catch {}
      jitsiApiRef.current = null;
    }
    onLeave();
  };

  const handleEndConference = async () => {
    setIsEnding(true);
    try {
      await api.endConference(conference.id);
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {}
        jitsiApiRef.current = null;
      }
      if (onEnded) {
        onEnded();
      } else {
        onLeave();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to end conference.');
    } finally {
      setIsEnding(false);
      setShowEndConfirm(false);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      id="jitsi-conference-container"
      className={`fixed inset-0 z-50 flex flex-col bg-slate-950 text-white ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-4'
      }`}
    >
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 px-4 py-3 rounded-t-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-emerald-900/60 border border-emerald-700/50 rounded-lg text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white truncate max-w-xs sm:max-w-md">
                {conference.title}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                Village: {conference.village_name || conference.village_id}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {conference.scheduled_time} ({conference.duration} mins)
              </span>
              {conference.created_by_name && (
                <span className="hidden sm:inline text-slate-500">
                  Host: {conference.created_by_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            id="jitsi-toggle-fullscreen"
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Leave Meeting: For all participants */}
          <button
            id="jitsi-leave-meeting-btn"
            onClick={handleLeave}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs sm:text-sm font-medium transition border border-slate-700"
          >
            <PhoneOff className="w-4 h-4 text-amber-400" />
            <span>Leave Meeting</span>
          </button>

          {/* End Conference for Everyone: Village Head host ONLY */}
          {canEndConference && (
            <button
              id="jitsi-end-conference-btn"
              onClick={() => setShowEndConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs sm:text-sm font-medium transition shadow-md shadow-rose-900/30"
            >
              <PowerOff className="w-4 h-4" />
              <span>End Conference</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Ending Conference */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">End Conference for Everyone?</h3>
            </div>
            <p className="text-sm text-slate-300 mb-6">
              As the Village Head, ending this conference will disconnect all members and mark the conference as concluded.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleEndConference}
                disabled={isEnding}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium"
              >
                {isEnding ? <Loader2 className="w-4 h-4 animate-spin" /> : <PowerOff className="w-4 h-4" />}
                <span>End for Everyone</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Jitsi Meeting Container */}
      <div className="relative flex-1 bg-black rounded-b-xl overflow-hidden border-x border-b border-slate-800">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm">Connecting to secure Jitsi Meet conference...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950 text-rose-400 z-10 p-6 text-center">
            <AlertCircle className="w-10 h-10" />
            <p className="text-sm max-w-md font-medium">{error}</p>
            <button
              onClick={handleLeave}
              className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm"
            >
              Return to Conferences
            </button>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
};
