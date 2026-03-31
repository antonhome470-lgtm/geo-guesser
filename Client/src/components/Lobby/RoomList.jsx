import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import toast from 'react-hot-toast';
import './Lobby.css';

const RoomList = () => {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (!socket) return;

    socket.emit('rooms:getList');

    socket.on('rooms:list', (data) => {
      setRooms(data);
    });

    socket.on('room:joined', (data) => {
      if (data.success) {
        navigate(`/room/${data.room.code}`);
      }
    });

    socket.on('error', (data) => {
      toast.error(data.message);
    });

    return () => {
      socket.off('rooms:list');
      socket.off('room:joined');
      socket.off('error');
    };
  }, [socket, navigate]);

  const handleJoin = (code) => {
    socket.emit('room:join', { code });
  };

  const handleJoinByCode = () => {
    if (joinCode.trim()) {
      socket.emit('room:join', { code: joinCode.trim().toUpperCase() });
    }
  };

  const getModeEmoji = (mode) => {
    const map = {
      classic: '🎯',
      solo: '🧑',
      duel: '⚔️',
      battle_royale: '👑',
      team: '👥',
      blitz: '⚡',
    };
    return map[mode] || '🎯';
  };

  return (
    <div className="room-list">
      <div className="join-by-code">
        <h3>🔑 Войти по коду</h3>
        <div className="join-input-group">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Код комнаты"
            maxLength={6}
          />
          <button className="btn btn-primary" onClick={handleJoinByCode}>
            Войти
          </button>
        </div>
      </div>

      <h3>🏠 Открытые комнаты</h3>

      {rooms.length === 0 ? (
        <div className="empty-rooms">
          <p>😴 Нет открытых комнат</p>
          <p>Создайте свою!</p>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map(room => (
            <div key={room.code} className="room-card">
              <div className="room-card-header">
                <span className="room-name">{room.name}</span>
                <span className="room-code">{room.code}</span>
              </div>

              <div className="room-info">
                <span>{getModeEmoji(room.settings?.gameMode)} {room.settings?.gameMode}</span>
                <span>👥 {room.players?.length || 0}/{room.maxPlayers}</span>
                <span>🔄 {room.settings?.rounds} раундов</span>
                <span>⏱️ {room.settings?.timeLimit}с</span>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => handleJoin(room.code)}
                disabled={room.players?.length >= room.maxPlayers}
              >
                {room.players?.length >= room.maxPlayers ? '🚫 Полная' : '🚪 Войти'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomList;
