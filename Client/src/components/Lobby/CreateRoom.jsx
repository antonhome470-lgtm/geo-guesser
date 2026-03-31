import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import './Lobby.css';

const CreateRoom = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [coordinateSets, setCoordinateSets] = useState([]);
  const [settings, setSettings] = useState({
    rounds: 5,
    timeLimit: 120,
    mapProvider: 'google',
    gameMode: 'classic',
    coordinateSet: 'world',
    movementAllowed: true,
    zoomAllowed: true,
    compassAllowed: true,
  });

  useEffect(() => {
    loadCoordinateSets();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('room:created', (data) => {
      if (data.success) {
        toast.success('Комната создана!');
        navigate(`/room/${data.room.code}`);
      }
    });

    socket.on('error', (data) => {
      toast.error(data.message);
    });

    return () => {
      socket.off('room:created');
      socket.off('error');
    };
  }, [socket, navigate]);

  const loadCoordinateSets = async () => {
    try {
      const res = await api.get('/coordinates/sets');
      setCoordinateSets(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = () => {
    if (!socket) return;

    socket.emit('room:create', {
      name: name || `Комната ${user.username}`,
      isPrivate,
      password: isPrivate ? password : null,
      maxPlayers,
      settings,
    });
  };

  const gameModes = [
    { id: 'classic', name: '🎯 Классический', desc: 'Все играют, побеждает набравший больше очков' },
    { id: 'solo', name: '🧑 Соло', desc: 'Играйте один и улучшайте свой рекорд' },
    { id: 'duel', name: '⚔️ Дуэль 1v1', desc: 'Один на один' },
    { id: 'battle_royale', name: '👑 Battle Royale', desc: 'Худший игрок вылетает каждый раунд' },
    { id: 'team', name: '👥 Команды', desc: 'Командный режим 2v2, 3v3' },
    { id: 'blitz', name: '⚡ Блиц', desc: '15 секунд на ответ' },
  ];

  return (
    <div className="create-room">
      <h2>🏠 Создать комнату</h2>

      <div className="create-form">
        <div className="form-section">
          <h3>📋 Основное</h3>

          <div className="form-group">
            <label>Название комнаты</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Моя комната"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Макс. игроков</label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
              >
                {[2, 4, 6, 8, 10, 15, 20].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                🔒 Приватная
              </label>
            </div>
          </div>

          {isPrivate && (
            <div className="form-group">
              <label>Пароль комнаты</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
              />
            </div>
          )}
        </div>

        <div className="form-section">
          <h3>🎮 Режим игры</h3>
          <div className="mode-grid">
            {gameModes.map(mode => (
              <div
                key={mode.id}
                className={`mode-card ${settings.gameMode === mode.id ? 'active' : ''}`}
                onClick={() => setSettings(s => ({
                  ...s,
                  gameMode: mode.id,
                  timeLimit: mode.id === 'blitz' ? 15 : s.timeLimit,
                }))}
              >
                <span className="mode-name">{mode.name}</span>
                <span className="mode-desc">{mode.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3>⚙️ Настройки игры</h3>

          <div className="form-row">
            <div className="form-group">
              <label>Количество раундов: {settings.rounds}</label>
              <input
                type="range"
                min="1"
                max="20"
                value={settings.rounds}
                onChange={(e) => setSettings(s => ({ ...s, rounds: Number(e.target.value) }))}
              />
            </div>

            <div className="form-group">
              <label>Время на раунд: {settings.timeLimit} сек</label>
              <input
                type="range"
                min="10"
                max="600"
                step="10"
                value={settings.timeLimit}
                onChange={(e) => setSettings(s => ({ ...s, timeLimit: Number(e.target.value) }))}
                disabled={settings.gameMode === 'blitz'}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Набор координат</label>
            <select
              value={settings.coordinateSet}
              onChange={(e) => setSettings(s => ({ ...s, coordinateSet: e.target.value }))}
            >
              {coordinateSets.map(set => (
                <option key={set.id} value={set.id}>
                  {set.name} ({set.count} мест)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Карты</label>
            <select
              value={settings.mapProvider}
              onChange={(e) => setSettings(s => ({ ...s, mapProvider: e.target.value }))}
            >
              <option value="google">Google Maps</option>
              <option value="yandex">Yandex Maps</option>
            </select>
          </div>

          <div className="toggle-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.movementAllowed}
                onChange={(e) => setSettings(s => ({ ...s, movementAllowed: e.target.checked }))}
              />
              🚶 Перемещение
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.zoomAllowed}
                onChange={(e) => setSettings(s => ({ ...s, zoomAllowed: e.target.checked }))}
              />
              🔍 Зум
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.compassAllowed}
                onChange={(e) => setSettings(s => ({ ...s, compassAllowed: e.target.checked }))}
              />
              🧭 Компас
            </label>
          </div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={handleCreate}>
          🚀 Создать комнату
        </button>
      </div>
    </div>
  );
};

export default CreateRoom;
