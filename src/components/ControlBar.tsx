import React from 'react';

interface ControlBarProps {
    muted: boolean;
    videoEnabled: boolean;
    chatOpen: boolean;
    notesOpen: boolean;
    recording: boolean;
    isHost: boolean;
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    onToggleChat: () => void;
    onToggleNotes: () => void;
    onToggleRecording: () => void;
    onOpenFilters: () => void;
    onShare: () => void;
    onLeave: () => void;
    onToggleParticipants: () => void;
    onToggleScreenShare: () => void;
    isScreenSharing: boolean;
    onEndMeeting?: () => void;
}

const ControlBar: React.FC<ControlBarProps> = ({
    muted,
    videoEnabled,
    chatOpen,
    notesOpen,
    recording,
    isHost,
    onToggleAudio,
    onToggleVideo,
    onToggleChat,
    onToggleNotes,
    onToggleRecording,
    onOpenFilters,
    onShare,
    onLeave,
    onToggleParticipants,
    onToggleScreenShare,
    isScreenSharing,
    onEndMeeting
}) => {
    return (
        <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-30 w-[95%] md:w-auto max-w-[calc(100%-2rem)]">
            <div className="flex items-center justify-center gap-1 md:gap-3 bg-slate-900/60 backdrop-blur-2xl px-2 py-2 md:px-6 md:py-4 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-x-auto no-scrollbar scroll-smooth">
                {/* Share Button */}
                <button
                    onClick={onShare}
                    className="p-2 md:p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all duration-300 flex-shrink-0"
                    title="Share Room ID"
                >
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                </button>

                <div className="hidden md:block w-px h-8 bg-white/10 mx-1"></div>

                <button
                    onClick={onToggleAudio}
                    className={`p-2 md:p-4 rounded-[1rem] md:rounded-[1.25rem] transition-all duration-300 flex-shrink-0 ${muted ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20' : 'bg-white/10 hover:bg-white/20'}`}
                >
                    {muted ? (
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM3 3l18 18" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    )}
                </button>

                {/* Video Button */}
                <button
                    onClick={onToggleVideo}
                    className={`p-2 md:p-4 rounded-[1rem] md:rounded-[1.25rem] transition-all duration-300 flex-shrink-0 ${!videoEnabled ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20' : 'bg-white/10 hover:bg-white/20'}`}
                >
                    {!videoEnabled ? (
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>

                {/* Filters Button */}
                <button
                    onClick={onOpenFilters}
                    className="p-2 md:p-4 rounded-[1rem] md:rounded-[1.25rem] transition-all duration-300 bg-white/10 hover:bg-white/20 flex-shrink-0"
                    title="Video Filters"
                >
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                </button>

                {/* Chat Button */}
                <button
                    onClick={onToggleChat}
                    className={`p-2 md:p-4 rounded-[1rem] md:rounded-[1.25rem] transition-all duration-300 flex-shrink-0 ${chatOpen ? 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white/10 hover:bg-white/20'}`}
                >
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                </button>

                {/* Notes Button */}
                <button
                    onClick={onToggleNotes}
                    className={`p-2 md:p-4 rounded-[1rem] md:rounded-[1.25rem] transition-all duration-300 flex-shrink-0 ${notesOpen ? 'bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-500/20' : 'bg-white/10 hover:bg-white/20'}`}
                    title="Meeting Notes"
                >
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>

                {/* Screen Share Button */}
                <button
                    onClick={onToggleScreenShare}
                    className={`p-2 md:p-4 rounded-[1rem] md:rounded-[1.25rem] transition-all duration-300 flex-shrink-0 ${isScreenSharing ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/20' : 'bg-white/10 hover:bg-white/20'}`}
                    title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                >
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2z" />
                    </svg>
                </button>

                {/* Participants Button */}
                <button
                    onClick={onToggleParticipants}
                    className="p-2 md:p-4 rounded-[1rem] md:rounded-[1.25rem] transition-all duration-300 bg-white/10 hover:bg-white/20 flex-shrink-0"
                    title="Participants"
                >
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </button>

                {/* Recording Button */}
                <button
                    onClick={onToggleRecording}
                    disabled={!isHost}
                    className={`p-2 md:p-4 rounded-[1rem] md:rounded-[1.25rem] transition-all duration-300 relative flex-shrink-0 ${!isHost
                        ? 'bg-white/5 text-white/30 cursor-not-allowed'
                        : recording
                            ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 animate-pulse'
                            : 'bg-white/10 hover:bg-white/20'
                        }`}
                    title={!isHost ? 'Host only' : recording ? 'Stop recording' : 'Start recording'}
                >
                    {recording ? (
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="6" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="6" strokeWidth="2" />
                        </svg>
                    )}
                    {!isHost && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-slate-600 rounded-full border border-slate-900"></div>
                    )}
                </button>

                <div className="hidden md:block w-px h-8 bg-white/10 mx-1"></div>

                {/* End / Leave Buttons */}
                <div className="flex items-center gap-2">
                    {isHost && onEndMeeting && (
                        <button
                            onClick={onEndMeeting}
                            className="p-2 md:p-4 bg-red-600 hover:bg-red-700 text-white rounded-[1rem] md:rounded-[1.25rem] shadow-lg shadow-red-600/20 transform hover:scale-110 active:scale-95 transition-all duration-300 flex-shrink-0"
                            title="End Meeting for All"
                        >
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={onLeave}
                        className={`p-2 md:p-4 text-white rounded-[1rem] md:rounded-[1.25rem] shadow-lg shadow-red-600/20 transform hover:scale-110 active:scale-95 transition-all duration-300 flex-shrink-0 ${isHost ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-600 hover:bg-red-700'}`}
                        title="Leave Room"
                    >
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ControlBar;
