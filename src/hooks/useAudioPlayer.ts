import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  playbackSpeed: number;
  error: string | null;
  play: (text: string) => Promise<void>;
  pause: () => void;
  togglePlay: (text: string) => void;
  seek: (percent: number) => void;
  cycleSpeed: () => void;
}

const audioCache = new Map<string, string>();

export const useAudioPlayer = (): UseAudioPlayerReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const currentTextRef = useRef<string>('');

  const speeds = [0.75, 1, 1.25, 1.5, 2];

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudio();
      // Don't revoke cached URLs on unmount - they may be reused
    };
  }, [cleanupAudio]);

  const play = useCallback(async (text: string) => {
    setError(null);

    // If same text and audio exists, just resume
    if (currentTextRef.current === text && audioRef.current && audioRef.current.src) {
      audioRef.current.playbackRate = playbackSpeed;
      await audioRef.current.play();
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(updateProgress);
      return;
    }

    setIsLoading(true);
    cleanupAudio();

    try {
      let audioUrl = audioCache.get(text);

      if (!audioUrl) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Faça login para ouvir o áudio');
        }
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ text }),
          }
        );

        if (!response.ok) {
          throw new Error('Falha ao gerar áudio');
        }

        const blob = await response.blob();
        audioUrl = URL.createObjectURL(blob);
        audioCache.set(text, audioUrl);
      }

      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;
      currentTextRef.current = text;

      audio.onended = () => {
        setIsPlaying(false);
        setProgress(100);
        cancelAnimationFrame(animFrameRef.current);
      };

      audio.onerror = () => {
        setError('Erro ao reproduzir áudio');
        setIsPlaying(false);
        setIsLoading(false);
      };

      audio.oncanplaythrough = async () => {
        setIsLoading(false);
        setDuration(audio.duration || 0);
        await audio.play();
        setIsPlaying(true);
        animFrameRef.current = requestAnimationFrame(updateProgress);
      };
    } catch (err) {
      console.error('Audio play error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar áudio');
      setIsLoading(false);
    }
  }, [playbackSpeed, cleanupAudio, updateProgress]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      cancelAnimationFrame(animFrameRef.current);
    }
  }, []);

  const togglePlay = useCallback((text: string) => {
    if (isPlaying) {
      pause();
    } else {
      play(text);
    }
  }, [isPlaying, pause, play]);

  const seek = useCallback((percent: number) => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = (percent / 100) * audio.duration;
      setProgress(percent);
      setCurrentTime(audio.currentTime);
    }
  }, []);

  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed(prev => {
      const idx = speeds.indexOf(prev);
      const next = speeds[(idx + 1) % speeds.length];
      if (audioRef.current) {
        audioRef.current.playbackRate = next;
      }
      return next;
    });
  }, []);

  return {
    isPlaying,
    isLoading,
    progress,
    duration,
    currentTime,
    playbackSpeed,
    error,
    play,
    pause,
    togglePlay,
    seek,
    cycleSpeed,
  };
};
