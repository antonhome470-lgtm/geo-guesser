import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { formatDistance, formatTime } from '../../utils/distance';
import './Profile.css';

const Statistics = () => {
  const { user } = useAuth();
  const [gameSummary, setGameSummary] = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      const [summaryRes, gamesRes] = await Promise.all([
        api.get('/games/stats/summary'),
        api.get('/games?limit=10&status=finished'),
      ]);

      if (summaryRes.data.success) {
        setGameSummary(summaryRes.data.data);
      }

      if (gamesRes.data.success) {
        setRecentGames(gamesRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="statistics-loading">
        <div className="spinner" />
        <p>Загрузка статистики...</p>
      </div>
    );
  }

  const s = user?.stats || {};
  const summary = gameSummary || {};

  const winRate = s.gamesPlayed > 0
    ? ((s.gamesWon / s.gamesPlayed) * 100).toFixed(1)
    : 0;

  const avgDistance = s.totalRounds > 0
    ? Math.round(s.totalDistance / s.totalRounds)
    : 0;

  const avgScorePerRound = s.totalRounds > 0
    ? Math.round(s.totalScore / s.totalRounds)
    : 0;

  const avgScorePerGame = s.gamesPlayed > 0
    ? Math.round(s.totalScore / s.gamesPlayed)
    : 0;

  const accuracy = s.totalRounds > 0
    ? ((s.correctGuesses / s.totalRounds) * 100).toFixed(1)
    : 0;

  return (
    <div className="statistics">
      <h2>📊 Подробная статистика</h2>

      {/* Основные показатели */}
      <div className="stats-overview">
        <div className="overview-card primary">
          <span className="overview-icon">🎮</span>
          <div className="overview-data">
            <span className="overview-value">{s.gamesPlayed || 0}</span>
            <span className="overview-label">Игр сыграно</span>
          </div>
        </div>

        <div className="overview-card success">
          <span className="overview-icon">🏆</span>
          <div className="overview-data">
            <span className="overview-value">{s.gamesWon || 0}</span>
            <span className="overview-label">Побед</span>
          </div>
        </div>

        <div className="overview-card warning">
          <span className="overview-icon">📊</span>
          <div className="overview-data">
            <span className="overview-value">{winRate}%</span>
            <span className="overview-label">Винрейт</span>
          </div>
        </div>

        <div className="overview-card info">
          <span className="overview-icon">⭐</span>
          <div className="overview-data">
            <span className="overview-value">{(s.totalScore || 0).toLocaleString('ru-RU')}</span>
            <span className="overview-label">Всего очков</span>
          </div>
        </div>
      </div>

      {/* Детальная статистика */}
      <div className="stats-detailed">
        <div className="stats-section">
          <h3>🎯 Точность</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Средняя дистанция</span>
              <span className="detail-value">{formatDistance(avgDistance)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Точных попаданий (&lt;50 км)</span>
              <span className="detail-value">{s.correctGuesses || 0}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Точность</span>
              <span className="detail-value">{accuracy}%</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Всего раундов</span>
              <span className="detail-value">{s.totalRounds || 0}</span>
            </div>
          </div>

          {/* Прогресс-бар точности */}
          <div className="accuracy-bar">
            <div className="accuracy-fill" style={{ width: `${Math.min(accuracy, 100)}%` }}>
              <span>{accuracy}%</span>
            </div>
          </div>
        </div>

        <div className="stats-section">
          <h3>💰 Очки</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Среднее за раунд</span>
              <span className="detail-value highlight">{avgScorePerRound}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Среднее за игру</span>
              <span className="detail-value">{avgScorePerGame}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Лучший счёт за игру</span>
              <span className="detail-value gold">{s.bestScore || 0}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Лучший раунд</span>
              <span className="detail-value gold">{s.bestRoundScore || 0}</span>
            </div>
          </div>

          {/* Визуализация среднего балла */}
          <div className="score-gauge">
            <div className="gauge-track">
              <div
                className="gauge-fill"
                style={{ width: `${Math.min((avgScorePerRound / 5000) * 100, 100)}%` }}
              />
              <div className="gauge-markers">
                <span style={{ left: '0%' }}>0</span>
                <span style={{ left: '25%' }}>1250</span>
                <span style={{ left: '50%' }}>2500</span>
                <span style={{ left: '75%' }}>3750</span>
                <span style={{ left: '100%' }}>5000</span>
              </div>
            </div>
            <p className="gauge-label">
              Средний балл за раунд: <strong>{avgScorePerRound}</strong> / 5000
            </p>
          </div>
        </div>

        <div className="stats-section">
          <h3>🔥 Серии</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Текущая серия побед</span>
              <span className="detail-value fire">{s.currentStreak || 0}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Лучшая серия</span>
              <span className="detail-value">{s.winStreak || 0}</span>
            </div>
          </div>

          {s.currentStreak > 0 && (
            <div className="streak-display">
              {Array.from({ length: Math.min(s.currentStreak, 20) }).map((_, i) => (
                <span key={i} className="streak-fire">🔥</span>
              ))}
              {s.currentStreak > 20 && <span className="streak-more">+{s.currentStreak - 20}</span>}
            </div>
          )}
        </div>

        {/* Распределение по режимам */}
        {summary.modeDistribution && Object.keys(summary.modeDistribution).length > 0 && (
          <div className="stats-section">
            <h3>🎮 Любимые режимы</h3>
            <div className="distribution-chart">
              {Object.entries(summary.modeDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([mode, count]) => {
                  const total = Object.values(summary.modeDistribution).reduce((a, b) => a + b, 0);
                  const percent = Math.round((count / total) * 100);
                  const modeNames = {
                    classic: '🎯 Классический',
                    solo: '🧑 Соло',
                    duel: '⚔️ Дуэль',
                    battle_royale: '👑 Battle Royale',
                    team: '👥 Команды',
                    blitz: '⚡ Блиц',
                  };

                  return (
                    <div key={mode} className="distribution-item">
                      <div className="distribution-header">
                        <span className="distribution-name">{modeNames[mode] || mode}</span>
                        <span className="distribution-count">{count} игр ({percent}%)</span>
                      </div>
                      <div className="distribution-bar">
                        <div
                          className="distribution-fill"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Последние игры */}
      {recentGames.length > 0 && (
        <div className="stats-section">
          <h3>🕐 Последние игры</h3>
          <div className="recent-games-table">
            {recentGames.map((game) => (
              <div
                key={game._id}
                className={`recent-game-row ${game.isWinner ? 'winner' : ''}`}
              >
                <span className="game-result">
                  {game.isWinner ? '🏆' : `#${game.myRank}`}
                </span>
                <span className="game-mode">
                  {game.settings?.gameMode || 'classic'}
                </span>
                <span className="game-score">
                  {game.myScore} очков
                </span>
                <span className="game-players">
                  👥 {game.totalPlayers}
                </span>
                <span className="game-date">
                  {game.finishedAt
                    ? new Date(game.finishedAt).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'
                  }
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;
