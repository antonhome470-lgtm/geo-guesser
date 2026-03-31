import { useCallback, useRef, useState, useEffect } from 'react';

const SOUND_MAP = {
  tick: '/sounds/tick.mp3',
  fanfare: '/sounds/fanfare.mp3',
  wrong: '/sounds/wrong.mp3',
  click: '/sounds/click.mp3',
  countdown: '/sounds/countdown.mp3',
  pop: '/sounds/pop.mp3',
  whoosh: '/sounds/whoosh.mp3',
  success: '/sounds/fanfare.mp3',
  error: '/sounds/wrong.mp3',
};

/**
 * Хук для звуковых эффектов
 * Поддерживает предзагрузку, регулировку громкости, мут
 */
export const useSound = () => {
  const audioRefs = useRef({});
  const [muted, setMuted] = useState(() => {
    const saved = localStorage.getItem('soundMuted');
    return saved === 'true';
  });
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('soundVolume');
    return saved ? parseFloat(saved) : 0.5;
  });

  // Сохраняем настройки
  useEffect(() => {
    localStorage.setItem('soundMuted', String(muted));
  }, [muted]);

  useEffect(() => {
    localStorage.setItem('soundVolume', String(volume));
  }, [volume]);

  /**
   * Предзагрузка звуков
   */
  const preload = useCallback((soundNames) => {
    soundNames.forEach(name => {
      const src = SOUND_MAP[name];
      if (src && !audioRefs.current[name]) {
        try {
          const audio = new Audio(src);
          audio.preload = 'auto';
          audio.volume = volume;
          audioRefs.current[name] = audio;
        } catch (e) {
          // Звук не критичен
        }
      }
    });
  }, [volume]);

  /**
   * Воспроизвести звук
   */
  const play = useCallback((soundName, options = {}) => {
    if (muted) return;

    try {
      const src = SOUND_MAP[soundName];
      if (!src) return;

      // Получаем или создаём аудио-элемент
      let audio = audioRefs.current[soundName];

      if (!audio) {
        audio = new Audio(src);
        audioRefs.current[soundName] = audio;
      }

      // Настройки
      audio.currentTime = 0;
      audio.volume = Math.min(1, Math.max(0, (options.volume || volume)));
      audio.loop = options.loop || false;
      audio.playbackRate = options.speed || 1;

      // Воспроизведение
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay blocked — нормально, игнорируем
        });
      }

      return audio;
    } catch (e) {
      // Звук не критичен — не ломаем приложение
      return null;
    }
  }, [muted, volume]);

  /**
   * Остановить звук
   */
  const stop = useCallback((soundName) => {
    const audio = audioRefs.current[soundName];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.loop = false;
    }
  }, []);

  /**
   * Остановить все звуки
   */
  const stopAll = useCallback(() => {
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
      }
    });
  }, []);

  /**
   * Переключить мут
   */
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      if (prev) {
        // Снимаем мут — проигрываем подтверждение
        setTimeout(() => {
          const audio = audioRefs.current['click'];
          if (audio) {
            audio.volume = volume;
            audio.play().catch(() => {});
          }
        }, 100);
      } else {
        stopAll();
      }
      return !prev;
    });
  }, [volume, stopAll]);

  /**
   * Установить громкость
   */
  const setVolume = useCallback((newVolume) => {
    const v = Math.min(1, Math.max(0, newVolume));
    setVolumeState(v);

    // Обновляем громкость у всех загруженных аудио
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) audio.volume = v;
    });
  }, []);

  /**
   * Воспроизвести тик таймера (с ускорением)
   */
  const playTimerTick = useCallback((timeLeft, totalTime) => {
    if (muted) return;

    // Ускоряем тик когда мало времени
    const urgency = 1 - (timeLeft / totalTime);
    const speed = 1 + urgency * 0.5;
    const vol = Math.min(volume, 0.2 + urgency * 0.3);

    play('tick', { volume: vol, speed });
  }, [muted, volume, play]);

  /**
   * Воспроизвести обратный отсчёт (последние 5 секунд)
   */
  const playCountdown = useCallback((secondsLeft) => {
    if (muted || secondsLeft > 5) return;
    play('countdown', { volume: Math.min(volume, 0.4 + (5 - secondsLeft) * 0.1) });
  }, [muted, volume, play]);

  // Cleanup
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
      audioRefs.current = {};
    };
  }, []);

  return {
    play,
    stop,
    stopAll,
    preload,
    toggleMute,
    setVolume,
    playTimerTick,
    playCountdown,
    muted,
    volume,
  };
};
