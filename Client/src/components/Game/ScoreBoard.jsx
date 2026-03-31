import React from 'react';

const ScoreBoard = ({ scores, currentUserId }) => {
  const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="scoreboard">
      <h4>🏆 Счёт</h4>
      <div className="score-list">
        {sorted.map((player, idx) => (
          <div
            key={player.userId}
            className={`score-item ${player.userId === currentUserId ? 'current-user' : ''} ${!player.isActive ? 'eliminated' : ''}`}
          >
            <span className="score-rank">
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
            </span>
            <span className="score-name">
              {player.username}
              {!player.isActive && ' ❌'}
            </span>
            <span className="score-value">{player.totalScore}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScoreBoard;
