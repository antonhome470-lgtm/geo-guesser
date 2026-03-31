import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import PanoramaView from './PanoramaView';
import MapPicker from './MapPicker';
import Timer from './Timer';
import RoundResults from './RoundResults';
import ScoreBoard from './ScoreBoard';
import { useTimer } from '../../hooks/useTimer';
import { useSound } from '../../hooks/useSound';
import toast from 'react-hot-toast';
import './Game.css';

const GameRoom = () => {
  const { code } = useParams();
  const { socket } = useSocket();
  const { user } = useAuth();
  const { play: playSound } = useSound();
  const navigate = useNavigate();

  // Состояния комнаты
  const [room, setRoom] = useState(null);
  const [isHost, setIsHost] = useState(false);

  // Состояния игры
  const [gameState, setGameState] = useState('waiting'); // waiting, playing, round_results, finished
  const [gameId, setGameId] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [totalRounds, setTotalRounds] = useState(0);
  const [panoramaLocation, setPanoramaLocation] = useState(null);
  const [guessLocation, setGuessLocation] = useState(null);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [roundResults, setRoundResults] = useState(null);
  const [finalResults, setFinalResults] = useState(null);
  const [scores, setScores] = useState([]);
  const [guessedPlayers, setGuessedPlayers] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [settings, setSettings] = useState(null);
  const [roundStartTime, setRoundStartTime] = useState(null);

  // Таймер
  const timer = useTimer(120, () => {
    if (isHost && socket) {
      socket.emit('game:timeUp', { gameId });
    }
  });

  // Подключение к комнате и Socket обработчики
  useEffect(() => {
    if (!socket) return;

    // Запрашиваем данные комнаты
    socket.emit('room:join', { code });

    // --- Обработчики комнаты ---
    socket.on('room:joined', (data) => {
      if (data.success) {
        setRoom(data.room);
        setIsHost(data.room.host.toString() === user.id || data.room.host._id === user.id);
      }
    });

    socket.on('room:playerJoined', (data) => {
      setRoom(prev => prev ? { ...prev, players: data.players } : prev);
      toast.success(`${data.player.username} присоединился`);
    });

    socket.on('room:playerLeft', (data) => {
      setRoom(prev => prev ? { ...prev, players: data.players } : prev);
    });

    socket.on('room:updated', (data) => {
      setRoom(prev => prev ? { ...prev, players: data.players } : prev);
    });

    socket.on('room:settingsUpdated', (data) => {
      setSettings(data.settings);
    });

    // --- Обработчики игры ---
    socket.on('game:started', (data) => {
      setGameId(data.gameId);
      setGameState('playing');
      setTotalRounds(data.totalRounds);
      setScores(data.players.map(p => ({ ...p, totalScore: 0 })));
      setSettings(data.settings);
      playSound('fanfare');
    });

    socket.on('game:roundStart', (data) => {
      setGameState('playing');
      setCurrentRound(data.roundNumber);
      setPanoramaLocation({ lat: data.location.lat, lng: data.location.lng });
      setGuessLocation(null);
      setHasGuessed(false);
      setRoundResults(null);
      setGuessedPlayers(0);
      setTotalPlayers(data.activePlayers.length);
      setRoundStartTime(Date.now());

      timer.reset(data.timeLimit);
      timer.start();
    });

    socket.on('game:playerGuessed', (data) => {
      setGuessedPlayers(data.totalGuesses);
      if (data.userId !== user.id) {
        toast(`${data.username} поставил метку`, { icon: '📍' });
      }
    });

    socket.on('game:roundResults', (data) => {
      setGameState('round_results');
      setRoundResults(data);
      setScores(data.scores);
      timer.stop();
    });

    socket.on('game:finished', (data) => {
      setGameState('finished');
      setFinalResults(data);
      timer.stop();
      playSound('fanfare');
    });

    socket.on('error', (data) => {
      toast.error(data.message);
    });

    return () => {
      socket.off('room:joined');
      socket.off('room:playerJoined');
      socket.off('room:playerLeft');
      socket.off('room:updated');
      socket.off('room:settingsUpdated');
      socket.off('game:started');
      socket.off('game:roundStart');
      socket.off('game:playerGuessed');
      socket.off('game:roundResults');
      socket.off('game:finished');
      socket.off('error');

      socket.emit('room:leave');
    };
  }, [socket, code, user.id]);

  // Обработка отправки предположения
  const handleGuess = useCallback(() => {
    if (!guessLocation || !socket || !gameId || hasGuessed) return;

    const timeSpent = Math.round((Date.now() - roundStartTime) / 1000);

    socket.emit('game:guess', {
      gameId,
      lat: guessLocation.lat,
      lng: guessLocation.lng,
      timeSpent,
    });

    setHasGuessed(true);
    playSound('click');
    toast.success('Метка поставлена! Ожидаем остальных...');
  }, [guessLocation, socket, gameId, hasGuessed, roundStartTime, playSound]);

  // Следующий раунд
  const handleNextRound = () => {
    if (socket && isHost) {
      socket.emit('game:nextRound', { gameId });
    }
  };

  // Начало игры
  const handleStartGame = () => {
    if (socket && isHost) {
      socket.emit('game:start', { code });
    }
  };

  // Готовность
  const handleReady = () => {
    if (socket) {
      socket.emit('room:ready', { code });
    }
  };

  // Покинуть комнату
  const handleLeave = () => {
    navigate('/');
  };

  // --- Рендер для состояния "Ожидание" ---
  if (gameState === 'waiting') {
    return (
      <div className="game-room">
        <div className="waiting-room">
          <div className="waiting-header">
            <h2>🏠 {room?.name || 'Комната'}</h2>
            <div className="room-code-display">
              Код: <span className="code">{code}</span>
              <button
                className="btn btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast.success('Код скопирован!');
                }}
              >
                📋 Копировать
              </button>
            </div>
          </div>

          <div className="players-list">
            <h3>👥 Игроки ({room?.players?.length || 0}/{room?.maxPlayers || 10})</h3>
            {room?.players?.map((player, idx) => (
              <div key={player.userId} className="player-item">
                <span className="player-number">{idx + 1}</span>
                <span className="player-name">
                  {player.username}
                  {player.userId.toString() === (room.host._id || room.host) && ' 👑'}
                </span>
                <span className={`player-status ${player.isReady ? 'ready' : 'not-ready'}`}>
                  {player.isReady ? '✅ Готов' : '⏳ Не готов'}
                </span>
              </div>
            ))}
          </div>

          {room?.settings && (
            <div className="settings-display">
              <h3>⚙️ Настройки</h3>
              <div className="settings-grid">
                <span>🔄 Раунды: {room.settings.rounds}</span>
                <span>⏱️ Время: {room.settings.timeLimit}с</span>
                <span>🎮 Режим: {room.settings.gameMode}</span>
                <span>🗺️ Карта: {room.settings.mapProvider}</span>
                <span>📍 Набор: {room.settings.coordinateSet}</span>
              </div>
            </div>
          )}

          <div className="waiting-actions">
            {!isHost && (
              <button className="btn btn-secondary" onClick={handleReady}>
                ✅ Готов / Не готов
              </button>
            )}
            {isHost && (
              <button className="btn btn-primary btn-lg" onClick={handleStartGame}>
                🚀 Начать игру
              </button>
            )}
            <button className="btn btn-danger" onClick={handleLeave}>
              🚪 Выйти
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Рендер для состояния "Финал" ---
  if (gameState === 'finished' && finalResults) {
    return (
      <div className="game-room">
        <div className="game-finished">
          <h1>🏆 Игра окончена!</h1>

          {finalResults.winner && (
            <div className="winner-card">
              <span className="winner-emoji">👑</span>
              <h2>{finalResults.winner.username}</h2>
              <p>{finalResults.winner.totalScore} очков</p>
            </div>
          )}

          <div className="final-scores">
            {finalResults.finalScores.map((player) => (
              <div key={player.userId} className={`final-score-item rank-${player.rank}`}>
                <span className="rank">#{player.rank}</span>
                <span className="name">{player.username}</span>
                <span className="score">{player.totalScore}</span>
              </div>
            ))}
          </div>

          <div className="final-actions">
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              🏠 В лобби
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Рендер для состояния "Результаты раунда" ---
  if (gameState === 'round_results' && roundResults) {
    return (
      <div className="game-room">
        <RoundResults
          results={roundResults}
          scores={scores}
          userId={user.id}
          isHost={isHost}
          onNextRound={handleNextRound}
          isLastRound={roundResults.isLastRound}
          mapProvider={settings?.mapProvider || 'google'}
        />
      </div>
    );
  }

  // --- Рендер для состояния "Игра" ---
  return (
    <div className="game-room">
      <div className="game-header">
        <div className="round-info">
          <span>Раунд {currentRound}/{totalRounds}</span>
        </div>
        <Timer
          timeLeft={timer.timeLeft}
          percentage={timer.percentage}
        />
        <div className="guess-counter">
          📍 {guessedPlayers}/{totalPlayers}
        </div>
      </div>

      <div className="game-content">
        <div className="panorama-section">
          {panoramaLocation && (
            <PanoramaView
              lat={panoramaLocation.lat}
              lng={panoramaLocation.lng}
              mapProvider={settings?.mapProvider || 'google'}
              movementAllowed={settings?.movementAllowed !== false}
            />
          )}
        </div>

        <div className="map-section">
          <MapPicker
            onLocationSelect={setGuessLocation}
            selectedLocation={guessLocation}
            disabled={hasGuessed}
          />

          <button
            className={`btn btn-guess ${hasGuessed ? 'guessed' : ''}`}
            onClick={handleGuess}
            disabled={!guessLocation || hasGuessed}
          >
            {hasGuessed ? '⏳ Ожидаем игроков...' : '📍 Поставить метку'}
          </button>
        </div>
      </div>

      <ScoreBoard scores={scores} currentUserId={user.id} />
    </div>
  );
};

export default GameRoom;
