import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import toast from 'react-hot-toast';
import './Lobby.css';

const JoinRoom = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentRooms, setRecentRooms] = useState([]);

  // Загружаем недавние комнаты из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentRooms');
    if (saved) {
      try {
        setRecentRooms(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('room:joined', (data) => {
      setLoading(false);
      if (data.success) {
        // Сохраняем в недавние
        saveRecentRoom(data.room.code, data.room.name);
        toast.success(`Вы вошли в комнату ${data.room.name}`);
        navigate(`/room/${data.room.code}`);
      }
    });

    socket.on('error', (data) => {
      setLoading(false);
      toast.error(data.message);
    });

    return () => {
      socket.off('room:joined');
      socket.off('error');
    };
  }, [socket, navigate]);

  const saveRecentRoom = (roomCode, roomName) => {
    const updated = [
      { code: roomCode, name: roomName, joinedAt: Date.now() },
      ...recentRooms.filter(r => r.code !== roomCode),
    ].slice(0, 10); // Храним 10 последних

    setRecentRooms(updated);
    localStorage.setItem('recentRooms', JSON.stringify(updated));
  };

  const handleJoin = (e) => {
    e.preventDefault();

    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedCode) {
      toast.error('Введите код комнаты');
      return;
    }

    if (trimmedCode.length < 4) {
      toast.error('Код комнаты слишком короткий');
      return;
    }

    if (!socket) {
      toast.error('Нет подключения к серверу');
      return;
    }

    setLoading(true);

    socket.emit('room:join', {
      code: trimmedCode,
      password: password || null,
    });
  };

  const handleJoinRecent = (roomCode) => {
    setCode(roomCode);
    if (socket) {
      setLoading(true);
      socket.emit('room:join', { code: roomCode });
    }
  };

  const handleRemoveRecent = (roomCode, e) => {
    e.stopPropagation();
    const updated = recentRooms.filter(r => r.code !== roomCode);
    setRecentRooms(updated);
    localStorage.setItem('recentRooms', JSON.stringify(updated));
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCode(value.slice(0, 8));
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      setCode(cleaned.slice(0, 8));
      toast.success('Код вставлен');
    } catch (e) {
      toast.error('Не удалось прочитать буфер обмена');
    }
  };

  return (
    <div className="join-room">
      <h2>🔑 Войти в комнату</h2>

      <form onSubmit={handleJoin} className="join-form">
        <div className="code-input-section">
          <div className="form-group">
            <label>Код комнаты</label>
            <div className="code-input-wrapper">
              <input
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="ABCDEF"
                className="code-input"
                maxLength={8}
                autoComplete="off"
                autoFocus
              />
              <button
                type="button"
                className="btn btn-sm btn-paste"
                onClick={handlePaste}
                title="Вставить из буфера"
              >
                📋
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="password-toggle">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              🔒 Комната с паролем
            </label>

            {showPassword && (
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль комнаты"
                className="password-input"
              />
            )}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg btn-join"
          disabled={!code.trim() || loading}
        >
          {loading ? (
            <>
              <span className="btn-spinner" />
              Подключение...
            </>
          ) : (
            <>🚪 Войти в комнату</>
          )}
        </button>
      </form>

      {/* Недавние комнаты */}
      {recentRooms.length > 0 && (
        <div className="recent-rooms">
          <h3>🕐 Недавние комнаты</h3>
          <div className="recent-list">
            {recentRooms.map((room) => (
              <div
                key={room.code}
                className="recent-item"
                onClick={() => handleJoinRecent(room.code)}
              >
                <div className="recent-info">
                  <span className="recent-code">{room.code}</span>
                  <span className="recent-name">{room.name}</span>
                  <span className="recent-time">
                    {formatTimeAgo(room.joinedAt)}
                  </span>
                </div>
                <button
                  className="btn-remove-recent"
                  onClick={(e) => handleRemoveRecent(room.code, e)}
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Инструкция */}
      <div className="join-help">
        <h4>💡 Как присоединиться?</h4>
        <ul>
          <li>Попросите хоста комнаты поделиться кодом</li>
          <li>Введите код и нажмите «Войти»</li>
          <li>Если комната приватная, потребуется пароль</li>
          <li>Или выберите из списка открытых комнат</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Форматирование времени "назад"
 */
function formatTimeAgo(timestamp) {
  const diff = Math.floor((Date.now() - timestamp) / 1000);

  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`;
  return new Date(timestamp).toLocaleDateString('ru-RU');
}

export default JoinRoom;
