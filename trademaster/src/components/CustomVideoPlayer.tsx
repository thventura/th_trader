import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

interface CustomVideoPlayerProps {
  videoId: string;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export function CustomVideoPlayer({ videoId }: CustomVideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Load the YouTube IFrame Player API code asynchronously.
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    let progressInterval: number;

    const initPlayer = () => {
      if (playerRef.current) return;
      
      playerRef.current = new window.YT.Player(`youtube-player-${videoId}`, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          controls: 0,
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          mute: 1,
          autoplay: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          autohide: 1
        },
        events: {
          onReady: () => setIsReady(true),
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              // Start tracking progress
              progressInterval = window.setInterval(() => {
                if (playerRef.current && playerRef.current.getDuration) {
                  const duration = playerRef.current.getDuration();
                  const currentTime = playerRef.current.getCurrentTime();
                  const realPercent = currentTime / (duration || 1);
                  
                  // Curva de desaceleração: p = real^0.6 (fica na frente e desacelera)
                  const slowDownPercent = Math.pow(realPercent, 0.6) * 100;
                  setProgress(slowDownPercent);
                }
              }, 200);
            } else {
              setIsPlaying(false);
              window.clearInterval(progressInterval);
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      window.clearInterval(progressInterval);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  const togglePlay = () => {
    if (!isReady || !playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      if (!hasStarted) {
        playerRef.current.unMute();
        setHasStarted(true);
      }
      playerRef.current.playVideo();
    }
  };

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden group">
      <div id={`youtube-player-${videoId}`} className="absolute inset-0 pointer-events-none scale-[1.35] translate-y-[-2%]" />
      
      {/* Overlay captures clicks and hides content */}
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-black/15 group-hover:bg-black/40 transition-all duration-500"
        onClick={togglePlay}
      >
        {!isPlaying && (
          <div className="text-center group-hover:scale-110 transition-all duration-500 z-50">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-apex-trader-primary rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.6)] mb-6 mx-auto border-4 border-white/20">
              <Play size={48} className="text-black ml-1.5" fill="currentColor" />
            </div>
            {!hasStarted && (
              <p className="text-white font-black tracking-[0.3em] text-xs md:text-sm uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
                {videoId === 'JZPTL5qROt4' ? 'ASSISTIR APRESENTAÇÃO' : 'ASSISTIR VÍDEO'}
              </p>
            )}
          </div>
        )}
        
        {isPlaying && (
           <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50">
              <div className="w-20 h-20 md:w-28 md:h-28 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-2xl">
                <Pause size={40} className="text-white" fill="currentColor" />
              </div>
           </div>
        )}

        {/* Fake Progress Bar - Variable Speed */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/5 overflow-hidden z-50">
          <div 
            className="h-full bg-apex-trader-primary shadow-[0_0_15px_rgba(59,130,246,0.8)] transition-all duration-300 ease-linear" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>

      {!isReady && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-apex-trader-primary/20 border-t-apex-trader-primary rounded-full animate-spin mb-2" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Carregando Player...</span>
        </div>
      )}
    </div>
  );
}
