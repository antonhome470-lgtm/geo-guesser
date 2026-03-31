import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './Profile.css';

const UserProfile = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);

  useEffect(() => {
    loadStats();
    loadHeatmap();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get(`/users/${user.id}/stats`);
      setStats(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadHeatmap = async () => {
    try {
      const res = await api.get('/users/me/heatmap');
      setHeatmapData(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const s = stats?.stats || user?.stats || {};

  const winRate = s.gamesPlayed > 0
    ? ((s.gamesWon / s.gamesPlayed) * 100).toFixed(1)
    : 0;

  const avgDistance = s.totalRounds > 0
    ? (s.totalDistance / s.totalRounds).toFixed(0)
    : 0;

  const avgScore = s.totalRounds > 0
    ? Math.round(s.totalScore / s.totalRounds)
    : 0;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="avatar-section">
          <div className="avatar-large">
            {user.username?.charAt(0).toUpperCase()}
          </div>
          <h2>{user.username}</h2>
          <p className="email">{user.email}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">🎮</span>
          <span className="stat-value">{s.gamesPlayed || 0}</span>
          <span className="stat-label">Игр сыграно</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🏆</span>
          <span className="stat-value">{s.gamesWon || 0}</span>
          <span className="stat-label">Побед</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <span className="stat-value">{winRate}%</span>
          <span className="stat-label">Винрейт</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⭐</span>
          <span className="stat-value">{s.totalScore || 0}</span>
          <span className="stat-label">Всего очков</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🎯</span>
          <span className="stat-value">{s.bestScore || 0}</span>
          <span className="stat-label">Лучший счёт</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📍</span>
          <span className="stat-value">{s.totalRounds || 0}</span>
          <span className="stat-label">Раундов</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📏</span>
          <span className="stat-value">{avgDistance} км</span>
          <span className="stat-label">Ср. расстояние</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💯</span>
          <span className="stat-value">{avgScore}</span>
          <span className="stat-label">Ср. очки/раунд</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <span className="stat-value">{s.currentStreak || 0}</span>
          <span className="stat-label">Серия побед</span>
        </div>
      </div>

      {stats?.achievements?.length > 0 && (
        <div className="achievements-section">
          <h3>🏅 Достижения</h3>
          <div className="achievements-grid">
            {stats.achievements.map((ach, idx) => (
              <div key={idx} className="achievement-card">
                <span className="achievement-name">{ach.name}</span>
                <span className="achievement-desc">{ach.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
