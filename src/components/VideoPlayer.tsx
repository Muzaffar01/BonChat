import React, { useEffect, useRef } from 'react';

interface VideoPlayerProps {
    stream: MediaStream;
    muted?: boolean;
    isLocal?: boolean;
    username?: string;
    filter?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ stream, muted = false, isLocal = false, username, filter = 'none' }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative w-full h-full rounded-3xl overflow-hidden glass-card group shadow-2xl">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={muted}
                className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
                style={{ filter }}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 z-10 flex items-center gap-2">
                <div className="bg-black/40 backdrop-blur-md px-2 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border border-white/10 flex items-center gap-1.5 md:gap-2 shadow-lg">
                    {isLocal && (
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                    <span className="text-[10px] md:text-xs font-semibold text-white tracking-wide uppercase">
                        {username || (isLocal ? 'You' : 'Participant')}
                    </span>
                </div>
            </div>

            {/* Status Indicators can go here */}
        </div>
    );
};

export default VideoPlayer;
