import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [roomId, setRoomId] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // New Meeting Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [meetingName, setMeetingName] = useState('');
  const [participantLimit, setParticipantLimit] = useState(25);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [previewVideo, setPreviewVideo] = useState(true);
  const [previewAudio, setPreviewAudio] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (showCreateModal && videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [showCreateModal, previewStream]);

  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setPreviewStream(stream);
    } catch (err) {
      console.error("Error accessing media devices", err);
    }
  };

  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    startPreview();
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    stopPreview();
  };

  const handleStartMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    const id = crypto.randomUUID();
    stopPreview();

    // Pass settings via session storage to keep URL clean
    const config = {
      roomId: id,
      name: meetingName || `${user?.username}'s Meeting`,
      limit: participantLimit,
      video: previewVideo,
      audio: previewAudio,
      username: user?.username,
      isHost: true
    };
    sessionStorage.setItem('bonchat_meeting_config', JSON.stringify(config));

    router.push(`/room/${id}`);
  };

  const joinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/room/${roomId}`);
    }
  };

  const scheduleMeeting = () => {
    setShowScheduleModal(true);
  };

  const togglePreviewVideo = () => {
    if (previewStream) {
      const videoTrack = previewStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setPreviewVideo(videoTrack.enabled);
      }
    }
  };

  const togglePreviewAudio = () => {
    if (previewStream) {
      const audioTrack = previewStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setPreviewAudio(audioTrack.enabled);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-pulse text-primary font-bold text-2xl">BonChat...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface text-surface-on relative overflow-hidden font-sans">
      {/* Navigation */}
      <nav className="relative z-20 border-b border-outline/10 bg-surface-container-low/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container text-primary-onContainer rounded-[12px] flex items-center justify-center shadow-m3-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">BonChat</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center gap-2 pl-2 pr-4 py-1.5 bg-surface-container-highest hover:bg-surface-container-high rounded-full border border-outline/10 transition-all group"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-105 transition-transform">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-medium pr-1">{user.username}</span>
            </button>
            <button
              onClick={logout}
              className="px-5 py-2 text-sm font-medium hover:bg-error/10 hover:text-error rounded-full transition-all duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20 text-center md:text-left">
        <div className="max-w-4xl animate-fade-in mx-auto md:mx-0">
          <h2 className="text-primary font-medium tracking-[0.1em] mb-4 uppercase text-sm">Next-Gen Video Conferencing</h2>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight leading-[1.1]">
            Experience meetings, <br />
            <span className="text-primary">refined and reimagined.</span>
          </h1>
          <p className="text-xl text-surface-onVariant mb-12 max-w-2xl leading-relaxed">
            Crystal clear communication for the modern web. BonChat combines performance with Material Design for an effortless experience.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Create Meeting Card */}
            <button
              onClick={openCreateModal}
              className="m3-card p-8 text-left hover:bg-surface-container-high transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-primary text-primary-on rounded-2xl flex items-center justify-center mb-6 shadow-m3-1 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">New Meeting</h3>
              <p className="text-surface-onVariant text-sm">Create a instant room and invite others.</p>
            </button>

            {/* Join Meeting Card */}
            <button
              onClick={() => setShowJoinInput(true)}
              className="m3-card p-8 text-left hover:bg-surface-container-high transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-primary-container text-primary-onContainer rounded-2xl flex items-center justify-center mb-6 shadow-m3-1 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Join with ID</h3>
              <p className="text-surface-onVariant text-sm">Jump into an ongoing meeting via code.</p>
            </button>

            {/* Schedule Meeting Card */}
            <button
              onClick={scheduleMeeting}
              className="m3-card p-8 text-left hover:bg-surface-container-high transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-surface-container-highest text-surface-onVariant rounded-2xl flex items-center justify-center mb-6 shadow-m3-1 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Schedule</h3>
              <p className="text-surface-onVariant text-sm">Coming soon: Plan and sync calendar.</p>
            </button>
          </div>
        </div>
      </main>

      {/* New Meeting Modal */}
      {showCreateModal && (
        <div className="m3-modal-overlay" onClick={closeCreateModal}>
          <div className="m3-modal-content max-w-[560px]" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-medium mb-1">Create Meeting</h3>
            <p className="text-surface-onVariant text-sm mb-6">Configure your meeting and check your camera.</p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Media Preview Column */}
              <div className="space-y-4">
                <div className="aspect-video bg-black rounded-2xl overflow-hidden relative shadow-m3-1">
                  {previewStream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${previewVideo ? '' : 'hidden'}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-container-highest">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  {!previewVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface-container-highest text-surface-onVariant">
                      <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={togglePreviewAudio}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${previewAudio ? 'bg-primary-container text-primary-onContainer' : 'bg-error/10 text-error'}`}
                  >
                    {previewAudio ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM3 3l18 18" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={togglePreviewVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${previewVideo ? 'bg-primary-container text-primary-onContainer' : 'bg-error/10 text-error'}`}
                  >
                    {previewVideo ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Form Column */}
              <form onSubmit={handleStartMeeting} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-primary uppercase tracking-wider ml-1">Meeting Name</label>
                  <input
                    type="text"
                    placeholder="E.g. Daily Sync"
                    value={meetingName}
                    onChange={(e) => setMeetingName(e.target.value)}
                    className="m3-input"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-semibold text-primary uppercase tracking-wider">Participant Limit</label>
                    <span className="text-xs text-surface-onVariant font-medium">{participantLimit}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    value={participantLimit}
                    onChange={(e) => setParticipantLimit(parseInt(e.target.value))}
                    className="w-full accent-primary bg-surface-container-highest rounded-lg h-2 cursor-pointer mt-2"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="m3-button-tonal flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="m3-button-filled flex-1"
                  >
                    Start
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal Popup */}
      {showJoinInput && (
        <div className="m3-modal-overlay" onClick={() => setShowJoinInput(false)}>
          <div className="m3-modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-medium mb-2">Join Meeting</h3>
            <p className="text-surface-onVariant text-sm mb-6">Enter the meeting ID provided by the host.</p>

            <form onSubmit={joinMeeting} className="space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-medium text-primary uppercase tracking-wider ml-1">Meeting ID</label>
                <input
                  type="text"
                  placeholder="Paste ID here..."
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="m3-input"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinInput(false)}
                  className="m3-button-tonal flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!roomId.trim()}
                  className="m3-button-filled flex-1"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Modal Popup */}
      {showScheduleModal && (
        <div className="m3-modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="m3-modal-content max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-surface-container-highest text-surface-onVariant rounded-2xl flex items-center justify-center shadow-m3-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-medium">Coming Soon</h3>
                <p className="text-surface-onVariant text-xs">Schedule feature is in development.</p>
              </div>
            </div>

            <p className="text-surface-on text-sm leading-relaxed mb-8">
              We're working hard to bring you a seamless scheduling experience. Soon you'll be able to plan meetings, set reminders, and sync with your calendar directly from BonChat.
            </p>

            <button
              onClick={() => setShowScheduleModal(false)}
              className="w-full m3-button-filled"
            >
              Understand
            </button>
          </div>
        </div>
      )}

      {/* Minimalistic Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-t border-outline/10 text-center md:text-left">
        <p className="text-surface-onVariant text-sm">
          © 2026 BonChat • Secured with E2E Encryption
        </p>
      </footer>
    </div>
  );
}
