import React from 'react';
import { formatTime } from '../../utils/distance';

const Timer = ({ timeLeft, percentage }) => {
  const isLow = timeLeft <= 10;
  const isCritical = timeLeft <= 5;

  return (
    <div className={`timer ${isLow ? 'low' : ''} ${isCritical ? 'critical' : ''}`}>
      <div className="timer-bar">
        <div
          className="timer-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="timer-text">
        ⏱️ {formatTime(timeLeft)}
      </span>
    </div>
  );
};

export default Timer;
