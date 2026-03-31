import { useState, useEffect, useCallback, useRef } from 'react';

export const useTimer = (initialTime, onTimeUp) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const onTimeUpRef = useRef(onTimeUp);

  onTimeUpRef.current = onTimeUp;

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const reset = useCallback((newTime) => {
    stop();
    setTimeLeft(newTime || initialTime);
  }, [initialTime, stop]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            clearInterval(intervalRef.current);
            onTimeUpRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const getTimeSpent = useCallback(() => {
    return initialTime - timeLeft;
  }, [initialTime, timeLeft]);

  return {
    timeLeft,
    isRunning,
    start,
    stop,
    reset,
    getTimeSpent,
    percentage: (timeLeft / initialTime) * 100,
  };
};
