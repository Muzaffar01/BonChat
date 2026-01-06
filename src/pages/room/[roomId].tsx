import { useEffect, useRef, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/router';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import VideoPlayer from '@/components/VideoPlayer';
import ControlBar from '@/components/ControlBar';
import Modal from '@/components/Modal';
import type Peer from 'simple-peer';
import { saveMessage, getMessages, Message } from '@/lib/messages';

interface PeerData {
    peerId: string;
    peer: Peer.Instance;
    stream?: MediaStream;
    username?: string;
    filter?: string;
}

export default function Room() {
    const router = useRouter();
    const { roomId } = router.query;
    const { supabase } = useSocket();
    const { user, loading } = useAuth();

    // Stable ID for this session
    const myIdRef = useRef<string>(user?.id || Math.random().toString(36).substr(2, 9));
    const myId = myIdRef.current;

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<PeerData[]>([]);
    const peersRef = useRef<PeerData[]>([]);

    const [muted, setMuted] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
    const [notesOpen, setNotesOpen] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);

    // New Features State
    const [showParticipants, setShowParticipants] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const screenStreamRef = useRef<MediaStream | null>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [myUsername, setMyUsername] = useState('You');

    // Notes states
    const [notesContent, setNotesContent] = useState('');
    const [notesSaved, setNotesSaved] = useState(true);
    const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Recording states
    const [isRecording, setIsRecording] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [hostId, setHostId] = useState<string | null>(null);
    const [isAdmitted, setIsAdmitted] = useState(false);
    const [waitingUsers, setWaitingUsers] = useState<{ id: string, username: string }[]>([]);

    // Admission Logic
    const [admissionStatus, setAdmissionStatus] = useState<'pending' | 'rejected'>('pending');

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    // Filter states
    const [showFiltersModal, setShowFiltersModal] = useState(false);

    // Generic Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        content: React.ReactNode;
        actions?: React.ReactNode;
        onClose: () => void;
    }>({
        isOpen: false,
        title: '',
        content: null,
        onClose: () => { }
    });

    const [activeFilter, setActiveFilter] = useState('none');
    const filterCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const filterStreamRef = useRef<MediaStream | null>(null);

    const [showMentionList, setShowMentionList] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');

    // File Upload State
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initialized = useRef(false);
    const channelRef = useRef<any>(null);
    const peerClassRef = useRef<typeof Peer | null>(null);

    // Notification Permission
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Auth Check & Config Load
    useEffect(() => {
        if (!loading) {
            if (!user) {
                // Redirect to login with return URL
                router.push(`/login?redirect=/room/${roomId}`);
                return;
            }

            // Consuming navigation state
            const stored = sessionStorage.getItem('bonchat_meeting_config');
            if (stored) {
                try {
                    const config = JSON.parse(stored);
                    if (config.roomId === roomId) {
                        setMuted(config.audio === false); // logic updates: if audio=true, muted=false
                        setVideoEnabled(config.video !== false);
                        setMyUsername(config.username || user.username || 'You');

                        // Handle host logic if passed
                        if (config.isHost) setIsHost(true);
                    } else {
                        // Config mismatch (old session), fallback to user defaults
                        setMyUsername(user.username || 'You');
                    }
                } catch (e) {
                    console.error("Error parsing meeting config", e);
                    setMyUsername(user.username || 'You');
                }
            } else {
                // Direct access fallback
                setMyUsername(user.username || 'You');

                // Fallback to query params just in case user shared a link with params old style
                if (router.query.username) setMyUsername(router.query.username as string);
            }
        }
    }, [user, loading, router, roomId]);

    // Apply initial media states to local stream
    useEffect(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = !muted);
            localStream.getVideoTracks().forEach(track => track.enabled = videoEnabled);
        }
    }, [localStream, muted, videoEnabled]);

    // Load messages on join
    useEffect(() => {
        if (roomId) {
            getMessages(roomId as string).then(msgs => {
                setMessages(msgs);
            });

            // Load notes from localStorage
            const savedNotes = localStorage.getItem(`meeting-notes-${roomId}`);
            if (savedNotes) {
                setNotesContent(savedNotes);
            }

            // Load saved filter
            const savedFilter = localStorage.getItem('videoFilter');
            if (savedFilter) {
                setActiveFilter(savedFilter);
            }
        }
    }, [roomId]);

    // Auto-save notes to localStorage
    useEffect(() => {
        if (!roomId) return;

        if (notesTimeoutRef.current) {
            clearTimeout(notesTimeoutRef.current);
        }

        setNotesSaved(false);

        notesTimeoutRef.current = setTimeout(() => {
            localStorage.setItem(`meeting-notes-${roomId}`, notesContent);
            setNotesSaved(true);
        }, 2000);

        return () => {
            if (notesTimeoutRef.current) {
                clearTimeout(notesTimeoutRef.current);
            }
        };
    }, [notesContent, roomId]);

    useEffect(() => {
        if (!roomId || !supabase || initialized.current) return;
        initialized.current = true;

        const init = async () => {
            try {
                const peerModule = await import('simple-peer');
                peerClassRef.current = peerModule.default;

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true,
                });
                setLocalStream(stream);

                const name = router.query.username as string || user?.username || 'Guest';
                setMyUsername(name);

                const channel = supabase.channel(`room:${roomId}`, {
                    config: {
                        presence: { key: myId },
                        broadcast: { self: true }
                    }
                });
                channelRef.current = channel;

                // Handle initial host state from session config
                const stored = sessionStorage.getItem('bonchat_meeting_config');
                let initialIsHost = false;
                if (stored) {
                    const c = JSON.parse(stored);
                    if (c.roomId === roomId && c.isHost) {
                        initialIsHost = true;
                        setIsHost(true);
                        setIsAdmitted(true);
                    }
                }

                if (!initialIsHost) {
                    // If not host, we wait for admission
                    // We will start sending requests once channel is subscribed
                }

                // --- EVENT HANDLERS ---

                // Signaling & Connection
                channel
                    .on('broadcast', { event: 'user-connected' }, ({ payload }) => {
                        const { userId, username, filter } = payload;
                        console.log('User connected:', userId, username, filter);
                        // Avoid connecting to self if broadcast somehow loops
                        if (userId === myId) return;

                        // Prevent duplicate connections
                        if (peersRef.current.find(p => p.peerId === userId)) {
                            console.log('Already connected to user:', userId);
                            return;
                        }

                        const peer = createPeer(userId, myId, stream, username, filter, channel);
                        peersRef.current.push({ peerId: userId, peer, username, filter });
                        setPeers([...peersRef.current]);
                    })
                    .on('broadcast', { event: 'receive-signal' }, ({ payload }) => {
                        if (payload.userToSignal !== myId) return;

                        const item = peersRef.current.find(p => p.peerId === payload.callerId);
                        if (item) {
                            item.peer.signal(payload.signal);
                            if (payload.filter) item.filter = payload.filter;
                        } else {
                            const peer = addPeer(payload.signal, payload.callerId, stream, channel);
                            peersRef.current.push({ peerId: payload.callerId, peer, username: payload.callerName, filter: payload.filter });
                            setPeers([...peersRef.current]);
                        }
                    })
                    .on('broadcast', { event: 'receive-return-signal' }, ({ payload }) => {
                        if (payload.userToSignal !== myId) return;
                        const item = peersRef.current.find(p => p.peerId === payload.callerId);
                        if (item) {
                            item.peer.signal(payload.signal);
                        }
                    })
                    // Chat & Events
                    .on('broadcast', { event: 'receive-message' }, ({ payload: data }) => {
                        console.log('Message received via broadcast:', data);

                        // Ignore our own messages as we handle them optimistically
                        if (data.userId === myId) return;

                        setMessages(prev => {
                            // Deduplicate just in case
                            if (prev.some(m => m.createdAt === data.createdAt && m.userId === data.userId)) {
                                return prev;
                            }
                            return [...prev, data];
                        });

                        const myNameAttr = myUsername || user?.username || 'You';
                        const isMention = data.message.includes(`@${myNameAttr}`);

                        playChatSound(isMention);
                        if (isMention || document.hidden) {
                            showBrowserNotification(
                                isMention ? `New mention from ${data.username}` : `New message from ${data.username}`,
                                data.message
                            );
                        }
                    })
                    .on('broadcast', { event: 'recording-started' }, () => {
                        setIsRecording(true);
                        playRecordingNotification();
                    })
                    .on('broadcast', { event: 'recording-stopped' }, () => {
                        setIsRecording(false);
                    })
                    .on('broadcast', { event: 'filter-changed' }, ({ payload }) => {
                        const { userId, filter } = payload;
                        console.log('Filter changed for user:', userId, filter);

                        // Update ref AND trigger state update
                        const peerIndex = peersRef.current.findIndex(p => p.peerId === userId);
                        if (peerIndex > -1) {
                            // Create new object to ensure React detects change
                            const updatedPeer = { ...peersRef.current[peerIndex], filter };
                            peersRef.current[peerIndex] = updatedPeer;
                            setPeers([...peersRef.current]);
                        }
                    })
                    // --- Waiting Room Signaling ---
                    .on('broadcast', { event: 'request-entry' }, ({ payload }) => {
                        const { userId, username } = payload;
                        console.log("Entry request from:", username);

                        setWaitingUsers(prev => {
                            if (prev.find(u => u.id === userId)) return prev;
                            return [...prev, { id: userId, username }];
                        });
                        playChatSound(true);
                    })
                    .on('broadcast', { event: 'meeting-ended' }, () => {
                        setModalConfig({
                            isOpen: true,
                            title: 'Meeting Ended',
                            content: 'The host has ended the meeting.',
                            onClose: () => { },
                            actions: (
                                <button
                                    onClick={() => {
                                        setModalConfig(prev => ({ ...prev, isOpen: false }));
                                        window.location.href = '/';
                                    }}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                                >
                                    OK
                                </button>
                            )
                        });
                    })
                    .on('broadcast', { event: 'entry-decision' }, ({ payload }) => {
                        const { targetId, decision } = payload;
                        // Use ref or functional update if myId closure is stale, but myId is a ref.current 
                        // initialized at start, so it's stable.
                        if (targetId === myId) {
                            if (decision === 'approved') {
                                setIsAdmitted(true);
                                setAdmissionStatus('pending');

                                // Now we can broadcast our presence
                                channel.track({
                                    online_at: new Date().toISOString(),
                                    userId: myId,
                                    username: myUsername,
                                    status: 'admitted'
                                });

                                channel.send({
                                    type: 'broadcast',
                                    event: 'user-connected',
                                    payload: { userId: myId, username: myUsername, filter: activeFilter }
                                });
                            } else if (decision === 'rejected') {
                                setAdmissionStatus('rejected');
                                setModalConfig({
                                    isOpen: true,
                                    title: 'Entry Denied',
                                    content: 'The host has denied your entry.',
                                    onClose: () => { },
                                    actions: (
                                        <button
                                            onClick={() => {
                                                setModalConfig(prev => ({ ...prev, isOpen: false }));
                                                router.push('/');
                                            }}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                                        >
                                            OK
                                        </button>
                                    )
                                });
                            }
                        }
                    })
                    // Presence for host and cleanup
                    .on('presence', { event: 'sync' }, () => {
                        const state = channel.presenceState();
                        const presences = Object.values(state).flat() as any[];

                        // Sync Waiting List (for Host)
                        const waiting = presences.filter(p => p.status === 'waiting');
                        // Deduplicate by userId
                        const uniqueWaiting = Array.from(new Map(waiting.map(item => [item.userId, item])).values());
                        setWaitingUsers(uniqueWaiting.map(p => ({ id: p.userId, username: p.username })));

                        // Elect host: first joined user
                        if (presences.length > 0) {
                            const sorted = presences.sort((a, b) => (new Date(a.online_at).getTime()) - (new Date(b.online_at).getTime()));
                            const electedHostId = sorted[0].userId;
                            setHostId(electedHostId);

                            // Simple logic: if I am the creator/host config, I stay host. 
                            // Fallback election not strictly needed if we rely on config, but good to have.
                            if (electedHostId === myId) {
                                // optional: setIsHost(true); 
                            }
                        }

                        // Cleanup disconnected peers
                        const currentPeerIds = presences.filter(p => p.status === 'admitted').map(p => p.userId);
                        const disconnectedPeers = peersRef.current.filter(p => !currentPeerIds.includes(p.peerId));

                        disconnectedPeers.forEach(p => p.peer.destroy());
                        peersRef.current = peersRef.current.filter(p => currentPeerIds.includes(p.peerId));
                        setPeers([...peersRef.current]);
                    })
                    .subscribe(async (status) => {
                        if (status === 'SUBSCRIBED') {
                            const savedFilter = localStorage.getItem('videoFilter') || 'none';
                            if (!initialIsHost) {
                                console.log("Requesting entry...");
                                await channel.track({
                                    online_at: new Date().toISOString(),
                                    userId: myId,
                                    username: name,
                                    status: 'waiting'
                                });
                                // We also broadcast for immediate notification
                                await channel.send({
                                    type: 'broadcast',
                                    event: 'request-entry',
                                    payload: { userId: myId, username: name }
                                });
                            } else {
                                const savedFilter = localStorage.getItem('videoFilter') || 'none';
                                await channel.track({
                                    online_at: new Date().toISOString(),
                                    userId: myId,
                                    username: name,
                                    joinTime: Date.now(),
                                    status: 'admitted'
                                });
                                channel.send({
                                    type: 'broadcast',
                                    event: 'user-connected',
                                    payload: { userId: myId, username: name, filter: savedFilter }
                                });
                            }
                        }
                    });

                // Cleanup on unmount handled by useEffect return
            } catch (err) {
                console.error('Failed to initialize room', err);
            }
        };

        init();

        return () => {
            supabase.removeAllChannels();
            channelRef.current = null;
            peersRef.current.forEach(p => p.peer.destroy());
            setPeers([]);
            peersRef.current = [];
        };
    }, [roomId, supabase]);

    function createPeer(userToSignal: string, callerId: string, stream: MediaStream, usernameToSignal: string | undefined, filter: string | undefined, channel: any) {
        const PeerClass = peerClassRef.current!;
        const peer = new PeerClass({
            initiator: true,
            trickle: false,
            stream,
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });

        const myName = myUsername || user?.username || 'Guest';
        const myFilter = localStorage.getItem('videoFilter') || 'none';

        peer.on('signal', signal => {
            channel.send({
                type: 'broadcast',
                event: 'receive-signal',
                payload: { userToSignal, callerId, signal, callerName: myName, filter: myFilter }
            });
        });

        peer.on('stream', (userStream) => {
            const p = peersRef.current.find(item => item.peerId === userToSignal);
            if (p) {
                p.stream = userStream;
                setPeers([...peersRef.current]);
            }
        });

        return peer;
    }

    function addPeer(incomingSignal: unknown, callerId: string, stream: MediaStream, channel: any) {
        const PeerClass = peerClassRef.current!;
        const peer = new PeerClass({
            initiator: false,
            trickle: false,
            stream,
            config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
        });

        peer.on('signal', signal => {
            channel.send({
                type: 'broadcast',
                event: 'receive-return-signal',
                payload: { signal, callerId: myId, userToSignal: callerId } // Use myId as callerId, initiator as userToSignal
            });
        });

        peer.on('stream', (userStream) => {
            const p = peersRef.current.find(item => item.peerId === callerId);
            if (p) {
                p.stream = userStream;
                setPeers([...peersRef.current]);
            }
        });
        peer.signal(incomingSignal as Peer.SignalData);
        return peer;
    }

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${roomId}/${myId}/${Date.now()}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('attachments')
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('attachments')
                .getPublicUrl(fileName);

            await sendMessage(undefined, {
                url: publicUrl,
                name: file.name,
                type: file.type
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            setModalConfig({
                isOpen: true,
                title: 'Upload Failed',
                content: 'Failed to upload file.',
                onClose: () => { },
                actions: <button onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 bg-blue-600 text-white rounded-lg">OK</button>
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const sendMessage = async (e?: React.FormEvent, fileData?: { url: string, name: string, type: string }) => {
        if (e) e.preventDefault();
        const msgText = newMessage.trim();
        const myChannel = channelRef.current;
        console.log("Attempting to send message. Channel:", !!myChannel);

        if (!msgText && !fileData) return;

        if (!myChannel) {
            console.error("Channel not initialized");
            setModalConfig({
                isOpen: true,
                title: 'Connection Lost',
                content: 'Connection lost. Please refresh the page.',
                onClose: () => { },
                actions: <button onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 bg-blue-600 text-white rounded-lg">OK</button>
            });
            return;
        }

        setNewMessage('');
        const username = myUsername || 'Guest';

        // Optimistic update
        const tempId = Date.now();
        const optimisticMsg: Message = {
            id: tempId,
            roomId: roomId as string,
            userId: myId,
            username,
            message: msgText,
            createdAt: tempId,
            fileUrl: fileData?.url,
            fileName: fileData?.name,
            fileType: fileData?.type
        };

        setMessages(prev => [...prev, optimisticMsg]);

        const msgData = {
            message: msgText,
            userId: myId,
            username,
            id: tempId, // Send ID to coordinate if needed
            roomId: roomId as string,
            createdAt: tempId,
            fileUrl: fileData?.url,
            fileName: fileData?.name,
            fileType: fileData?.type
        };

        console.log("Sending broadcast:", msgData);

        try {
            await myChannel.send({
                type: 'broadcast',
                event: 'receive-message',
                payload: msgData
            });

            await saveMessage(
                roomId as string,
                myId,
                username,
                msgText,
                fileData?.url,
                fileData?.name,
                fileData?.type
            );
        } catch (err) {
            console.error("Failed to send/save message", err);
            // Optionally rollback optimistic update here if needed
        }
    };

    const toggleAudio = () => {
        if (localStream) {
            const enabled = localStream.getAudioTracks()[0].enabled;
            localStream.getAudioTracks()[0].enabled = !enabled;
            setMuted(enabled);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const enabled = localStream.getVideoTracks()[0].enabled;
            localStream.getVideoTracks()[0].enabled = !enabled;
            setVideoEnabled(!enabled);
        }
    };

    const leaveRoom = () => {
        // Stop recording if active
        if (isRecording && mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
        router.push('/');
    };

    const shareRoom = () => {
        if (roomId) {
            navigator.clipboard.writeText(roomId as string);
            setShowShareModal(true);
        }
    };

    const playRecordingNotification = () => {
        // Use Web Speech API for text-to-speech
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance('This meeting is being recorded');
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            window.speechSynthesis.speak(utterance);
        }

        // Also play a beep sound
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    };

    const playChatSound = (isMention: boolean) => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            if (isMention) {
                // Energetic chime for mentions
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
            } else {
                // Subtle blip for normal messages
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.05);
                gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            }

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.6);
        } catch (e) {
            console.warn("Audio Context error:", e);
        }
    };

    const showBrowserNotification = (title: string, body: string) => {
        if ("Notification" in window && Notification.permission === "granted") {
            try {
                new Notification(title, {
                    body,
                    icon: '/favicon.ico' // Default app icon
                });
            } catch (e) {
                console.warn("Notification error:", e);
            }
        }
    };

    const handleChatInputChange = (val: string) => {
        setNewMessage(val);

        // Detect @ for mentions
        const lastWord = val.split(' ').pop();
        if (lastWord?.startsWith('@')) {
            setMentionFilter(lastWord.substring(1).toLowerCase());
            setShowMentionList(true);
        } else {
            setShowMentionList(false);
        }
    };

    const selectMentionUser = (username: string) => {
        const words = newMessage.split(' ');
        words.pop(); // Remove the @filter
        const updatedMsg = words.length > 0 ? [...words, `@${username} `].join(' ') : `@${username} `;
        setNewMessage(updatedMsg);
        setShowMentionList(false);
    };

    const renderMessageContent = (text: string, fileUrl?: string, fileName?: string, fileType?: string) => {
        const content = [];

        if (fileUrl) {
            const isImage = fileType?.startsWith('image/');
            if (isImage) {
                content.push(
                    <div key="image" className="mb-2">
                        <img
                            src={fileUrl}
                            alt={fileName || 'Attached image'}
                            className="max-w-full rounded-lg max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(fileUrl, '_blank')}
                        />
                    </div>
                );
            } else {
                content.push(
                    <a
                        key="file"
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-black/20 p-3 rounded-xl mb-2 hover:bg-black/30 transition-colors"
                    >
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate text-white">{fileName || 'Attachment'}</div>
                            <div className="text-xs text-slate-400">Click to download</div>
                        </div>
                    </a>
                );
            }
        }

        if (text) {
            const parts = text.split(/(@[\w\s]+)/g);
            content.push(
                <span key="text">
                    {parts.map((part, i) => {
                        if (part.startsWith('@')) {
                            const cleanPart = part.substring(1).trim();
                            const isMyMention = cleanPart === (myUsername || user?.username || '');
                            return (
                                <span
                                    key={i}
                                    className={`font-bold px-1 rounded ${isMyMention
                                        ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                                        : 'text-blue-400'}`}
                                >
                                    {part}
                                </span>
                            );
                        }
                        return part;
                    })}
                </span>
            );
        }

        return <>{content}</>;
    };

    const downloadNotes = () => {
        const blob = new Blob([notesContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-notes-${roomId}-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const clearNotes = () => {
        setModalConfig({
            isOpen: true,
            title: 'Clear Notes',
            content: 'Are you sure you want to clear all notes? This cannot be undone.',
            onClose: () => { },
            actions: (
                <>
                    <button
                        onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            setNotesContent('');
                            if (roomId) {
                                localStorage.removeItem(`meeting-notes-${roomId}`);
                            }
                            setModalConfig(prev => ({ ...prev, isOpen: false }));
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                    >
                        Clear
                    </button>
                </>
            )
        });
    };

    const endMeeting = async () => {
        setModalConfig({
            isOpen: true,
            title: 'End Meeting',
            content: 'Are you sure you want to end the meeting for everyone? This action cannot be undone.',
            onClose: () => { },
            actions: (
                <>
                    <button
                        onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                        className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            if (channelRef.current) {
                                await channelRef.current.send({
                                    type: 'broadcast',
                                    event: 'meeting-ended',
                                    payload: {}
                                });
                            }
                            setModalConfig(prev => ({ ...prev, isOpen: false }));
                            setTimeout(() => {
                                router.push('/');
                            }, 500);
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                    >
                        End Meeting
                    </button>
                </>
            )
        });
    };


    const applyFilter = (filter: string) => {
        setActiveFilter(filter);
        localStorage.setItem('videoFilter', filter);
        setShowFiltersModal(false);

        // Notify other participants using the persistent channel ref
        const myChannel = channelRef.current;
        if (myChannel) {
            console.log('Broadcasting filter change:', filter);
            myChannel.send({
                type: 'broadcast',
                event: 'filter-changed',
                payload: { userId: myId, filter }
            });
        } else {
            console.warn('Channel not available to broadcast filter change');
        }
    };

    const getFilterStyle = (filter: string): string => {
        switch (filter) {
            case 'grayscale':
                return 'grayscale(100%)';
            case 'sepia':
                return 'sepia(100%)';
            case 'blur':
                return 'blur(8px)';
            case 'brightness':
                return 'brightness(1.3)';
            case 'contrast':
                return 'contrast(1.5)';
            case 'invert':
                return 'invert(100%)';
            default:
                return 'none';
        }
    };

    const toggleRecording = async () => {
        if (!isHost) return;

        if (!isRecording) {
            // Start recording
            try {
                // Create a combined stream from local stream and all peer streams
                const audioContext = new AudioContext();
                const destination = audioContext.createMediaStreamDestination();

                // Add local audio
                if (localStream) {
                    const localAudioTracks = localStream.getAudioTracks();
                    localAudioTracks.forEach(track => {
                        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
                        source.connect(destination);
                    });
                }

                // Add peer audio
                peers.forEach(peerData => {
                    if (peerData.stream) {
                        const audioTracks = peerData.stream.getAudioTracks();
                        audioTracks.forEach(track => {
                            const source = audioContext.createMediaStreamSource(new MediaStream([track]));
                            source.connect(destination);
                        });
                    }
                });

                // Create a canvas to combine all video streams
                const canvas = document.createElement('canvas');
                canvas.width = 1920;
                canvas.height = 1080;
                const ctx = canvas.getContext('2d')!;

                // Get all video elements with their filters
                const videoData: { el: HTMLVideoElement, filter: string }[] = [];
                if (localStream) {
                    const localVideo = document.createElement('video');
                    localVideo.srcObject = localStream;
                    localVideo.muted = true;
                    await localVideo.play();
                    videoData.push({ el: localVideo, filter: getFilterStyle(activeFilter) });
                }

                for (const peerData of peers) {
                    if (peerData.stream) {
                        const peerVideo = document.createElement('video');
                        peerVideo.srcObject = peerData.stream;
                        peerVideo.muted = true;
                        await peerVideo.play();
                        videoData.push({ el: peerVideo, filter: getFilterStyle(peerData.filter || 'none') });
                    }
                }

                // Draw videos on canvas in a grid layout
                const drawFrame = () => {
                    if (!isRecording && mediaRecorderRef.current?.state !== 'recording') return;

                    ctx.fillStyle = '#020617';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    const videoCount = videoData.length;
                    const cols = Math.ceil(Math.sqrt(videoCount));
                    const rows = Math.ceil(videoCount / cols);
                    const videoWidth = canvas.width / cols;
                    const videoHeight = canvas.height / rows;

                    videoData.forEach((data, index) => {
                        const col = index % cols;
                        const row = Math.floor(index / cols);
                        const x = col * videoWidth;
                        const y = row * videoHeight;

                        // Apply filter to canvas context temporarily
                        ctx.save();
                        ctx.filter = data.filter;
                        ctx.drawImage(data.el, x, y, videoWidth, videoHeight);
                        ctx.restore();
                    });

                    requestAnimationFrame(drawFrame);
                };

                drawFrame();

                // Combine canvas video stream with mixed audio
                const canvasStream = canvas.captureStream(30);
                const videoTrack = canvasStream.getVideoTracks()[0];
                const audioTrack = destination.stream.getAudioTracks()[0];

                const combinedStream = new MediaStream([videoTrack, audioTrack]);

                // Create MediaRecorder with MP4 preference
                let mimeType = 'video/mp4;codecs=h264,aac';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'video/webm;codecs=vp9,opus';
                }

                const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });

                recordedChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const blob = new Blob(recordedChunksRef.current, { type: mimeType });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    // Use .mp4 as it's more universal even if webm container is used
                    a.download = `meeting-${roomId}-${Date.now()}.mp4`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    recordedChunksRef.current = [];
                };

                mediaRecorder.start();
                mediaRecorderRef.current = mediaRecorder;

                // Notify other participants
                const myChannel = supabase.getChannels().find(c => c.topic === `room:${roomId}`);
                if (myChannel) {
                    myChannel.send({
                        type: 'broadcast',
                        event: 'recording-started'
                    });
                }
                setIsRecording(true);
            } catch (err) {
                console.error('Failed to start recording:', err);
                alert('Failed to start recording. Please try again.');
            }
        } else {
            // Stop recording
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current = null;
            }

            const myChannel = supabase.getChannels().find(c => c.topic === `room:${roomId}`);
            if (myChannel) {
                myChannel.send({
                    type: 'broadcast',
                    event: 'recording-stopped'
                });
            }
            setIsRecording(false);
        }
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            // Stop sharing
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => track.stop());
                screenStreamRef.current = null;
            }
            setIsScreenSharing(false);

            // Revert to camera
            const videoTrack = localStream?.getVideoTracks()[0];
            if (videoTrack) {
                peersRef.current.forEach(peerData => {
                    // Check if peer handles replacement (simple-peer)
                    // We need to replace string track
                    // NOTE: simple-peer replaceTrack signature: (oldTrack, newTrack, stream)
                    const sender = (peerData.peer as any)._pc.getSenders().find((s: any) => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });
            }
        } else {
            // Start sharing
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                screenStreamRef.current = stream;
                setIsScreenSharing(true);

                const screenTrack = stream.getVideoTracks()[0];


                screenTrack.onended = () => {
                    toggleScreenShare(); // Revert when user stops via browser UI
                };

                // Replace track for all peers
                peersRef.current.forEach(peerData => {
                    const sender = (peerData.peer as any)._pc.getSenders().find((s: any) => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenTrack);
                    }
                });

            } catch (err) {
                console.error("Failed to share screen", err);
            }
        }
    };

    if (loading || !user) return null;

    return (
        <div className="flex h-[100dvh] bg-[#020617] text-white overflow-hidden font-sans relative">

            {/* Waiting Screen Overlay */}
            {!isAdmitted && !loading && (
                <div className="absolute inset-0 z-50 bg-[#020617] flex flex-col items-center justify-center p-6 animate-fade-in">
                    <div className="w-full max-w-md space-y-8 text-center">
                        <div className="w-20 h-20 bg-blue-600/20 text-blue-500 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight mb-2">Waiting for host</h2>
                            <p className="text-slate-400">Please wait, the meeting host will let you in soon.</p>
                        </div>

                        {/* Local Preview while waiting */}
                        <div className="aspect-video bg-black rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl mx-auto w-full max-w-[320px]">
                            {localStream && (
                                <video
                                    ref={el => { if (el) el.srcObject = localStream }}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                />
                            )}
                            <div className="absolute bottom-4 left-4">
                                <span className="text-xs font-bold px-2 py-1 bg-black/60 rounded-lg">{myUsername} (You)</span>
                            </div>
                        </div>

                        {admissionStatus === 'rejected' && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                                Entry denied by host.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Host: Waiting List Notification */}
            {isHost && waitingUsers.length > 0 && (
                <div className="absolute top-20 left-4 z-40 w-80 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-in-left">
                    <div className="p-4 border-b border-white/5 bg-blue-600/10 flex justify-between items-center">
                        <h3 className="font-bold text-sm tracking-wide uppercase text-blue-400">Waiting Room ({waitingUsers.length})</h3>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {waitingUsers.map(u => (
                            <div key={u.id} className="p-3 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                                        {u.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-sm truncate max-w-[100px]">{u.username}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            channelRef.current?.send({
                                                type: 'broadcast',
                                                event: 'entry-decision',
                                                payload: { targetId: u.id, decision: 'rejected' }
                                            });
                                            setWaitingUsers(prev => prev.filter(pu => pu.id !== u.id));
                                        }}
                                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Deny">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => {
                                            channelRef.current?.send({
                                                type: 'broadcast',
                                                event: 'entry-decision',
                                                payload: { targetId: u.id, decision: 'approved' }
                                            });
                                            setWaitingUsers(prev => prev.filter(pu => pu.id !== u.id));
                                        }}
                                        className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors" title="Admit">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className={`flex - 1 flex flex - col relative transition - all duration - 500 ${chatOpen ? 'mr-0' : ''} `}>

                {/* Header (Floating) */}
                <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-6 z-20 flex justify-between items-center pointer-events-none">
                    <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 pointer-events-auto">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <span className="font-bold text-sm tracking-tight">{router.query.name || 'BonChat Room'}</span>
                        <div className="w-px h-4 bg-white/20 mx-1"></div>
                        <span className="text-xs text-slate-400 font-mono tracking-wider">{roomId?.toString().slice(0, 8)}...</span>
                    </div>

                    <div className="flex items-center gap-3 pointer-events-auto">
                        <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Live</span>
                        </div>
                        {isRecording && (
                            <div className="bg-red-500/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-red-500/30 flex items-center gap-2 animate-pulse">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span className="text-xs font-bold uppercase tracking-widest text-red-400">Recording</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Video Grid */}
                <div className="flex-1 p-4 md:p-6 flex items-center justify-center overflow-y-auto pt-20 pb-28 md:pt-24 md:pb-32">
                    <div className={`w - full h - full max - w - 7xl grid gap - 4 md: gap - 6 transition - all duration - 500 ${peers.length === 0 ? 'grid-cols-1' :
                        peers.length === 1 ? 'grid-cols-1 md:grid-cols-2' :
                            peers.length <= 3 ? 'grid-cols-1 md:grid-cols-2' :
                                'grid-cols-1 md:grid-cols-3'
                        } `}>
                        {localStream && (
                            <div className="relative animate-fade-in aspect-video md:aspect-auto">
                                <VideoPlayer stream={localStream} muted={true} isLocal={true} username={myUsername} filter={getFilterStyle(activeFilter)} />
                            </div>
                        )}
                        {peers.map((peerData) => (
                            peerData.stream && (
                                <div key={peerData.peerId} className="relative animate-fade-in aspect-video md:aspect-auto">
                                    <VideoPlayer
                                        stream={peerData.stream}
                                        username={peerData.username}
                                        filter={getFilterStyle(peerData.filter || 'none')}
                                    />
                                </div>
                            )
                        ))}
                    </div>
                </div>

                {/* Control Bar */}
                <ControlBar
                    muted={muted}
                    videoEnabled={videoEnabled}
                    chatOpen={chatOpen}
                    notesOpen={notesOpen}
                    recording={isRecording}
                    isHost={isHost}
                    onToggleAudio={toggleAudio}
                    onToggleVideo={toggleVideo}
                    onToggleChat={() => setChatOpen(!chatOpen)}
                    onToggleNotes={() => setNotesOpen(!notesOpen)}
                    onToggleRecording={toggleRecording}
                    onOpenFilters={() => setShowFiltersModal(true)}
                    onShare={shareRoom}
                    onLeave={leaveRoom}
                    onToggleParticipants={() => setShowParticipants(!showParticipants)}
                    onToggleScreenShare={toggleScreenShare}
                    isScreenSharing={isScreenSharing}
                    onEndMeeting={endMeeting}
                />
            </div>

            {/* Chat/Participants Sidebar */}
            <div className={`fixed inset-y-0 right-0 md:relative transition-all duration-500 transform ${chatOpen || showParticipants ? 'translate-x-0 w-full md:w-[400px] border-l border-white/5' : 'translate-x-full w-0'} bg-[#0f172a]/95 md:bg-[#0f172a]/80 backdrop-blur-2xl overflow-hidden flex flex-col relative z-50`}>
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-bold">{showParticipants ? 'Participants' : 'Room Chat'}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => { setChatOpen(false); setShowParticipants(false); }} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {showParticipants ? (
                    // Participants List View
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {/* Me */}
                        <div className="p-4 bg-white/5 rounded-2xl flex items-center justify-between border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
                                    {myUsername.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{myUsername} (You)</p>
                                    <p className="text-xs text-slate-400">{isHost ? 'Host' : 'Participant'}</p>
                                </div>
                            </div>
                            {isHost && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold uppercase">Host</span>}
                        </div>

                        {/* Peers */}
                        {peers.map(p => {
                            const isPeerHost = p.peerId === hostId;
                            return (
                                <div key={p.peerId} className="p-4 hover:bg-white/5 rounded-2xl flex items-center justify-between border border-transparent hover:border-white/5 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold">
                                            {(p.username || 'Guest').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{p.username || 'Guest'}</p>
                                            <p className="text-xs text-slate-400">{isPeerHost ? 'Host' : 'Participant'}</p>
                                        </div>
                                    </div>
                                    {isPeerHost && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold uppercase">Host</span>}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // Chat View (Existing)
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col-reverse">
                        <div className="space-y-6">
                            {messages.map((msg, i) => {
                                const isMe = msg.userId === myId;
                                return (
                                    <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                                {isMe ? 'You' : msg.username || 'Participant'}
                                            </span>
                                        </div>
                                        <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isMe
                                            ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/10'
                                            : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/5'
                                            }`}>
                                            {renderMessageContent(msg.message, msg.fileUrl, msg.fileName, msg.fileType)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {!showParticipants && (
                    <div className="p-6 bg-slate-900/40 border-t border-white/5">
                        <form onSubmit={(e) => sendMessage(e)} className="relative">
                            {showMentionList && (
                                <div className="absolute bottom-full left-0 w-full mb-2 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                                    <div className="p-3 border-b border-white/5 bg-white/5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Mention User</span>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto py-1">
                                        {peers
                                            .filter(p => !mentionFilter || p.username?.toLowerCase().includes(mentionFilter))
                                            .map(p => (
                                                <button
                                                    key={p.peerId}
                                                    type="button"
                                                    onClick={() => selectMentionUser(p.username || 'Participant')}
                                                    className="w-full text-left px-5 py-3 hover:bg-blue-600/20 flex items-center gap-3 transition-colors"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-[10px] flex items-center justify-center font-bold">
                                                        {(p.username || 'P')[0].toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium">{p.username || 'Participant'}</span>
                                                </button>
                                            ))
                                        }
                                        {peers.length === 0 && (
                                            <div className="px-5 py-4 text-xs text-slate-500 italic">No other participants to mention</div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <input
                                className="w-full bg-[#020617] border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                                value={newMessage}
                                onChange={e => handleChatInputChange(e.target.value)}
                                placeholder="Send a message... (@ for names)"
                            />
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <div className="absolute right-2 top-2 bottom-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                                    title="Attach file"
                                >
                                    {isUploading ? (
                                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                    )}
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-slate-800 rounded-xl transition-all h-full"
                                >
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Notes Sidebar */}
            <div className={`fixed inset-y-0 right-0 md:relative transition-all duration-500 transform ${notesOpen ? 'translate-x-0 w-full md:w-[400px] border-l border-white/5' : 'translate-x-full w-0'} bg-[#0f172a]/95 md:bg-[#0f172a]/80 backdrop-blur-2xl overflow-hidden flex flex-col relative z-50`}>
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold">Meeting Notes</h3>
                        <span className={`text-xs px-2 py-1 rounded-full transition-all ${notesSaved ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {notesSaved ? 'Saved' : 'Saving...'}
                        </span>
                    </div>
                    <button onClick={() => setNotesOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <textarea
                        className="w-full h-full bg-[#020617] border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-purple-500/50 transition-all placeholder:text-slate-600 resize-none"
                        value={notesContent}
                        onChange={(e) => setNotesContent(e.target.value)}
                        placeholder="Take notes during the meeting..."
                    />
                    <div className="mt-2 text-xs text-slate-500">
                        {notesContent.length} characters • {notesContent.split(/\s+/).filter(w => w).length} words
                    </div>
                </div>

                <div className="p-6 bg-slate-900/40 border-t border-white/5 flex gap-3">
                    <button
                        onClick={downloadNotes}
                        disabled={!notesContent.trim()}
                        className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:bg-slate-800 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                    </button>
                    <button
                        onClick={clearNotes}
                        disabled={!notesContent.trim()}
                        className="px-4 py-3 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 disabled:bg-slate-800 text-red-400 rounded-xl transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
            {/* Share Modal */}
            {
                showShareModal && (
                    <div className="m3-modal-overlay" onClick={() => setShowShareModal(false)}>
                        <div className="m3-modal-content max-w-[400px]" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-primary-container text-primary-onContainer rounded-2xl flex items-center justify-center shadow-m3-1">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6L15.316 8.684m.684 1.342a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6L15.316 8.684m.684 1.342a3 3 0 110-2.684m0 2.684a3 3 0 110-2.684" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-medium">Invite Others</h3>
                                    <p className="text-surface-onVariant text-xs">Share this meeting ID with participants.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="relative group">
                                    <div className="absolute -top-2.5 left-4 px-1.5 bg-surface-container text-[10px] font-bold text-primary uppercase tracking-widest z-10">Meeting ID</div>
                                    <div className="flex items-center gap-2 p-4 bg-surface-container-highest rounded-2xl border border-outline/10 group-focus-within:border-primary/30 transition-all">
                                        <span className="flex-1 font-mono text-lg tracking-wider text-surface-on">{roomId}</span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(roomId as string);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            className={`px - 4 py - 2 rounded - xl text - xs font - bold uppercase tracking - widest transition - all ${copied ? 'bg-green-500 text-white' : 'bg-primary text-primary-on shadow-m3-1 hover:shadow-m3-2 active:scale-95'} `}
                                        >
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setShowShareModal(false)}
                                    className="w-full m3-button-tonal"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Filters Modal */}
            {
                showFiltersModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFiltersModal(false)}>
                        <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-6 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold">Video Filters</h3>
                                <button onClick={() => setShowFiltersModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'none', name: 'None', icon: '✨' },
                                    { id: 'grayscale', name: 'Grayscale', icon: '⚫' },
                                    { id: 'sepia', name: 'Sepia', icon: '🟤' },
                                    { id: 'blur', name: 'Blur', icon: '🌫️' },
                                    { id: 'brightness', name: 'Bright', icon: '☀️' },
                                    { id: 'contrast', name: 'Contrast', icon: '🔆' },
                                    { id: 'invert', name: 'Invert', icon: '🔄' },
                                ].map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => applyFilter(filter.id)}
                                        className={`p - 4 rounded - 2xl border - 2 transition - all duration - 300 ${activeFilter === filter.id
                                            ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/20'
                                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                                            } `}
                                    >
                                        <div className="text-4xl mb-2">{filter.icon}</div>
                                        <div className="text-sm font-bold">{filter.name}</div>
                                        {activeFilter === filter.id && (
                                            <div className="mt-2 text-xs text-purple-400">Active</div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                                <p className="text-sm text-blue-300">
                                    💡 <strong>Tip:</strong> Filters are applied to your video in real-time and will be visible to other participants.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Generic Modal */}
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={() => {
                    modalConfig.onClose();
                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                }}
                title={modalConfig.title}
                actions={modalConfig.actions}
            >
                {modalConfig.content}
            </Modal>
        </div>
    );
}
