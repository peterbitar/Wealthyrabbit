"use client";

import { useState, useRef, useEffect } from "react";

interface AudioPlayerProps {
  url: string;
  audioId: string;
}

export default function AudioPlayer({ url, audioId }: AudioPlayerProps) {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (audio) {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
  };

  const cyclePlaybackRate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];

    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-rabbit-lavender-500/10 rounded-lg p-3 flex items-center gap-3">
      <audio
        ref={audioRef}
        id={audioId}
        preload="metadata"
        className="hidden"
      >
        <source src={url} type="audio/mpeg" />
        <source src={url} type="audio/ogg" />
        Your browser does not support the audio element.
      </audio>

      {/* Play/Pause Button */}
      <button
        onClick={handlePlayPause}
        className="w-10 h-10 rounded-full bg-rabbit-lavender-500 flex items-center justify-center hover:bg-rabbit-lavender-600 transition-all flex-shrink-0 shadow-md hover:shadow-lg active:scale-95"
        aria-label={isPlaying ? 'Pause' : 'Play'}
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

      {/* Progress Bar and Time */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="w-full h-1.5 bg-gray-600/50 rounded-full overflow-hidden cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-rabbit-lavender-500 rounded-full transition-all duration-100 ease-linear group-hover:bg-rabbit-lavender-400"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-mono">
            {formatTime(currentTime)}
          </span>
          <span className="text-xs text-gray-500 font-mono">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Playback Speed Button */}
      <button
        onClick={cyclePlaybackRate}
        className="px-2 py-1 rounded-md bg-rabbit-lavender-500/20 hover:bg-rabbit-lavender-500/30 transition-colors flex-shrink-0 text-xs font-medium text-rabbit-lavender-300 min-w-[40px]"
        aria-label="Change playback speed"
      >
        {playbackRate}x
      </button>
    </div>
  );
}
