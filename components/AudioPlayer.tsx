"use client";

import { useState } from "react";

interface AudioPlayerProps {
  url: string;
  audioId: string;
}

export default function AudioPlayer({ url, audioId }: AudioPlayerProps) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    const audio = document.getElementById(audioId) as HTMLAudioElement;
    if (audio) {
      if (audio.paused) {
        audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = document.getElementById(audioId) as HTMLAudioElement;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audio) {
      audio.currentTime = percent * audio.duration;
    }
  };

  return (
    <div className="w-full bg-rabbit-lavender-500/10 rounded-lg p-3 flex items-center gap-3">
      <audio
        id={audioId}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(e) => {
          const audio = e.target as HTMLAudioElement;
          setDuration(audio.duration);
        }}
        onTimeUpdate={(e) => {
          const audio = e.target as HTMLAudioElement;
          setProgress((audio.currentTime / audio.duration) * 100);
        }}
        onEnded={() => setIsPlaying(false)}
      >
        <source src={url} type="audio/ogg" />
        <source src={url} type="audio/mpeg" />
      </audio>

      <button
        onClick={handlePlayPause}
        className="w-10 h-10 rounded-full bg-rabbit-lavender-500 flex items-center justify-center hover:bg-rabbit-lavender-600 transition-colors flex-shrink-0"
      >
        {isPlaying ? (
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        ) : (
          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      <div className="flex-1 flex items-center gap-3">
        <div
          className="flex-1 h-1.5 bg-gray-600 rounded-full overflow-hidden cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-rabbit-lavender-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="text-xs text-gray-400 font-mono w-10 text-right">
          {Math.floor(duration || 0)}s
        </span>
      </div>
    </div>
  );
}
