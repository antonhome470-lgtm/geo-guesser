import { useCallback, useRef } from 'react';

export const useSound = () => {
  const audioRefs = useRef({});

  const play = useCallback((soundName) => {
    try {
      const soundMap = {
        tick: '/sounds/tick.mp3',
        fanfare: '/sounds/fanfare.mp3',
        wrong: '/sounds/wrong.mp3',
        click: '/sounds/click.mp3',
        countdown: '/sounds/countdown.mp3',
      };

      const src = soundMap[soundName];
      if (!src) return;

      if (!audioRefs.current[soundName]) {
        audioRefs.current[soundName] = new Audio(src);
      }

      const audio = audioRefs.current[soundName];
      audio.currentTime = 0;
      audio.volume = 0.5;
      audio.play().catch(() => {}); // Игнорируем ошибки autoplay
    } catch (e) {
      // Звук не критичен
    }
  }, []);

  const stop = useCallback((soundName) => {
    if (audioRefs.current[soundName]) {
      audioRefs.current[soundName].pause();
      audioRefs.current[soundName].currentTime = 0;
    }
  }, []);

  return { play, stop };
};
