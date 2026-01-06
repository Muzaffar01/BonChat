import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

export default function JoinRoom() {
    const router = useRouter();
    const { roomId } = router.query;
    const { user, loading } = useAuth();

    const [name, setName] = useState('');
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (user?.username) {
            setName(user.username);
        }
    }, [user]);

    useEffect(() => {
        const startStream = async () => {
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setStream(s);
                if (videoRef.current) {
                    videoRef.current.srcObject = s;
                }
            } catch (err) {
                console.error('Failed to get stream', err);
            }
        };
        startStream();

        return () => {
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    const toggleVideo = () => {
        if (stream) {
            const track = stream.getVideoTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setVideoEnabled(track.enabled);
            }
        }
    };

    const toggleAudio = () => {
        if (stream) {
            const track = stream.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setAudioEnabled(track.enabled);
            }
        }
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && roomId) {
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }

            // Save settings to session storage
            sessionStorage.setItem('bonchat_meeting_config', JSON.stringify({
                roomId,
                username: name,
                video: videoEnabled,
                audio: audioEnabled
            }));

            router.push(`/room/${roomId}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="animate-pulse text-primary font-bold text-2xl">BonChat...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface text-surface-on flex items-center justify-center p-6 font-sans">
            <main className="w-full max-w-[480px] animate-fade-in">
                <div className="m3-card p-8 bg-surface-container shadow-m3-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-primary-container text-primary-onContainer rounded-2xl flex items-center justify-center shadow-m3-1">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Ready to join?</h1>
                            <p className="text-surface-onVariant text-sm">Configure your settings before entering.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Video Preview */}
                        <div className="aspect-video bg-black rounded-2xl overflow-hidden relative shadow-m3-1 border border-outline/10">
                            {stream ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className={`w-full h-full object-cover transform scale-x-[-1] ${videoEnabled ? '' : 'hidden'}`}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                                </div>
                            )}
                            {!videoEnabled && (
                                <div className="absolute inset-0 flex items-center justify-center bg-surface-container-highest text-surface-onVariant">
                                    <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
                                    </svg>
                                </div>
                            )}
                            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                                <span className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white">
                                    {name || 'Guest'}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={toggleAudio}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${audioEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-error/80 text-white'}`}
                                    >
                                        {audioEnabled ? (
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
                                        onClick={toggleVideo}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${videoEnabled ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-error/80 text-white'}`}
                                    >
                                        {videoEnabled ? (
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
                        </div>

                        <form onSubmit={handleJoin} className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-primary uppercase tracking-wider ml-1">Display Name</label>
                                <input
                                    type="text"
                                    placeholder="Ente your name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="m3-input"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => router.push('/')}
                                    className="m3-button-tonal flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="m3-button-filled flex-1"
                                    disabled={!name.trim()}
                                >
                                    Join Room
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
