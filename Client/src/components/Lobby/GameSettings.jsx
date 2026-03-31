import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Lobby.css';

const GameSettings = ({ settings, onChange, isHost, gameMode }) => {
  const [coordinateSets, setCoordinateSets] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadCoordinateSets();
  }, []);

  const loadCoordinateSets = async () => {
    try {
      const res = await api.get('/coordinates/sets');
      if (res.data.success) {
        setCoordinateSets(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load coordinate sets:', e);
    }
  };

  const handleChange = (key, value) => {
    if (!isHost) return;
    onChange({ ...settings, [key]: value });
  };

  // Пресеты настроек
  const presets = [
    {
      name: '⚡ Быстрая',
      desc: '3 раунда, 60 сек',
      settings: { rounds: 3, timeLimit: 60 },
    },
    {
      name: '🎯 Стандарт',
      desc: '5 раундов, 120 сек',
      settings: { rounds: 5, timeLimit: 120 },
    },
    {
      name: '🏔️ Марафон',
      desc: '10 раундов, 180 сек',
      settings: { rounds: 10, timeLimit: 180 },
    },
    {
      name: '🔥 Хардкор',
      desc: '5 раундов, 30 сек, без движения',
      settings: { rounds: 5, timeLimit: 30, movementAllowed: false, zoomAllowed: false },
    },
    {
      name: '⚡ Блиц',
      desc: '10 раундов, 15 сек',
      settings: { rounds: 10, timeLimit: 15 },
    },
  ];

  const applyPreset = (preset) => {
    if (!isHost) return;
    onChange({ ...settings, ...preset.settings });
  };

  // Определяем лимиты для блиц-режима
  const isBlitz = gameMode === 'blitz';
  const minTime = isBlitz ? 5 : 10;
  const maxTime = isBlitz ? 30 : 600;
  const timeStep = isBlitz ? 5 : 10;

  return (
    <div className="game-settings">
      <div className="settings-section">
        <h3>🎛️ Настройки игры</h3>

        {!isHost && (
          <div className="settings-readonly-notice">
            🔒 Только хост может изменять настройки
          </div>
        )}

        {/* Пресеты */}
        {isHost && (
          <div className="presets-section">
            <label className="settings-label">Быстрые пресеты</label>
            <div className="presets-grid">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  className="preset-btn"
                  onClick={() => applyPreset(preset)}
                  title={preset.desc}
                >
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-desc">{preset.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Основные настройки */}
        <div className="settings-main">
          <div className="setting-item">
            <div className="setting-header">
              <label>🔄 Количество раундов</label>
              <span className="setting-value">{settings.rounds}</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={settings.rounds}
              onChange={(e) => handleChange('rounds', parseInt(e.target.value))}
              disabled={!isHost}
              className="setting-slider"
            />
            <div className="slider-labels">
              <span>1</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-header">
              <label>⏱️ Время на раунд</label>
              <span className="setting-value">{settings.timeLimit} сек</span>
            </div>
            <input
              type="range"
              min={minTime}
              max={maxTime}
              step={timeStep}
              value={settings.timeLimit}
              onChange={(e) => handleChange('timeLimit', parseInt(e.target.value))}
              disabled={!isHost}
              className="setting-slider"
            />
            <div className="slider-labels">
              <span>{minTime}с</span>
              <span>{Math.round((minTime + maxTime) / 2)}с</span>
              <span>{maxTime}с</span>
            </div>
          </div>

          <div className="setting-item">
            <label className="settings-label">📍 Набор локаций</label>
            <select
              value={settings.coordinateSet}
              onChange={(e) => handleChange('coordinateSet', e.target.value)}
              disabled={!isHost}
              className="setting-select"
            >
              {coordinateSets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name} — {set.description} ({set.count} мест)
                </option>
              ))}
            </select>
          </div>

          <div className="setting-item">
            <label className="settings-label">🗺️ Провайдер карт</label>
            <div className="map-provider-grid">
              <button
                className={`provider-btn ${settings.mapProvider === 'google' ? 'active' : ''}`}
                onClick={() => handleChange('mapProvider', 'google')}
                disabled={!isHost}
              >
                <span className="provider-icon">🟢</span>
                <span className="provider-name">Google Maps</span>
                <span className="provider-desc">Street View панорамы</span>
              </button>
              <button
                className={`provider-btn ${settings.mapProvider === 'yandex' ? 'active' : ''}`}
                onClick={() => handleChange('mapProvider', 'yandex')}
                disabled={!isHost}
              >
                <span className="provider-icon">🔴</span>
                <span className="provider-name">Yandex Maps</span>
                <span className="provider-desc">Яндекс Панорамы</span>
              </button>
            </div>
          </div>
        </div>

        {/* Расширенные настройки */}
        <div className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
          <span>{showAdvanced ? '▼' : '▶'} Расширенные настройки</span>
        </div>

        {showAdvanced && (
          <div className="settings-advanced">
            <div className="toggle-settings">
              <label className={`toggle-setting ${!isHost ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={settings.movementAllowed !== false}
                  onChange={(e) => handleChange('movementAllowed', e.target.checked)}
                  disabled={!isHost}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
                <span className="toggle-text">
                  🚶 Перемещение по панораме
                  <small>Игрок может перемещаться по улицам</small>
                </span>
              </label>

              <label className={`toggle-setting ${!isHost ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={settings.zoomAllowed !== false}
                  onChange={(e) => handleChange('zoomAllowed', e.target.checked)}
                  disabled={!isHost}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
                <span className="toggle-text">
                  🔍 Приближение/отдаление
                  <small>Зум на панораме</small>
                </span>
              </label>

              <label className={`toggle-setting ${!isHost ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={settings.compassAllowed !== false}
                  onChange={(e) => handleChange('compassAllowed', e.target.checked)}
                  disabled={!isHost}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
                <span className="toggle-text">
                  🧭 Компас
                  <small>Показывать направление</small>
                </span>
              </label>

              <label className={`toggle-setting ${!isHost ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={settings.showHints || false}
                  onChange={(e) => handleChange('showHints', e.target.checked)}
                  disabled={!isHost}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
                <span className="toggle-text">
                  💡 Подсказки
                  <small>Показывать подсказки через половину времени</small>
                </span>
              </label>

              <label className={`toggle-setting ${!isHost ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={settings.speedBonus !== false}
                  onChange={(e) => handleChange('speedBonus', e.target.checked)}
                  disabled={!isHost}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
                <span className="toggle-text">
                  ⚡ Бонус за скорость
                  <small>Дополнительные очки за быстрый ответ</small>
                </span>
              </label>
            </div>

            {/* Сложность */}
            <div className="setting-item">
              <label className="settings-label">📊 Фильтр сложности</label>
              <select
                value={settings.difficulty || 'all'}
                onChange={(e) => handleChange('difficulty', e.target.value)}
                disabled={!isHost}
                className="setting-select"
              >
                <option value="all">Все уровни</option>
                <option value="easy">Лёгкий — известные места</option>
                <option value="medium">Средний</option>
                <option value="hard">Сложный — малоизвестные места</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Сводка настроек */}
      <div className="settings-summary">
        <h4>📋 Итого</h4>
        <div className="summary-items">
          <span>🔄 {settings.rounds} раундов</span>
          <span>⏱️ {settings.timeLimit} сек на раунд</span>
          <span>🗺️ {settings.mapProvider === 'google' ? 'Google' : 'Yandex'}</span>
          <span>📍 {coordinateSets.find(s => s.id === settings.coordinateSet)?.name || settings.coordinateSet}</span>
          {!settings.movementAllowed && <span>🚫 Без движения</span>}
          {!settings.zoomAllowed && <span>🚫 Без зума</span>}
          <span>
            ⏰ ~{Math.round((settings.rounds * settings.timeLimit) / 60)} мин макс.
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameSettings;
