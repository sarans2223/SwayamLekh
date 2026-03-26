import { useState, useEffect } from 'react';

export function useExamTimer(totalSeconds) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds || 10800);
  const [isRunning, setIsRunning] = useState(true); // Default to auto-start

  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatted = new Date(timeLeft * 1000).toISOString().substring(11, 19);
  const isTimeUp = timeLeft <= 0;
  const isWarning = timeLeft <= 900;
  const isCritical = timeLeft <= 300;

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);

  return { timeLeft, formatted, isWarning, isCritical, isTimeUp, start, pause };
}

// Ensure default export is also provided
export default useExamTimer;