import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useGameContext } from '../contexts/GameContext';
import { useSound } from './useSound';
import toast from 'react-hot-toast';

/**
 * Хук для управления игровой логикой
 * Связывает Socket.IO события с GameContext
 */
export const useGame = (roomCode) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const game = useGameContext();
  const { play: playSound } = useSound();
  const roundTimerRef = useRef(null);

  // --- Подключение Socket обработчиков ---
  useEffect(() => {
    if (!socket || !roomCode) return;

    // Присоединяемся к комнате
    socket.emit('room:join', { code: roomCode });

    // === Обработчики комнаты ===

    socket.on('room:joined', (data) => {
      if (data.success) {
        const isHost = data.room.host.toString() === user.id
          || data.room.host._id === user.id;
        game.setRoom(data.room, isHost);
        game.setGameState('waiting');
        game.setSettings(data.room.settings);
      }
    });

    socket.on('room:playerJoined', (data) => {
      game.setRoom(
        { ...game.room, players: data.players },
        game.isHost
      );
      toast(`${data.player.username} присоединился 👋`, { icon: '🟢' });
      playSound('click');
    });

    socket.on('room:playerLeft', (data) => {
      game.setRoom(
        { ...game.room, players: data.players },
        game.isHost
      );
    });

    socket.on('room:updated', (data) => {
      game.setRoom(
        { ...game.room, players: data.players },
        game.isHost
      );
    });

    socket.on('room:settingsUpdated', (data) => {
      game.setSettings(data.settings);
    });

    // === Обработчики игры ===

    socket.on('game:started', (data) => {
      game.setGameId(data.gameId);
      game.setGameState('playing');
      game.setSettings(data.settings);
      game.setScores(data.players.map(p => ({ ...p, totalScore: 0 })));
      playSound('fanfare');
      toast.success('🎮 Игра началась!');
    });

    socket.on('game:roundStart', (data) => {
      game.setGameState('playing');
      game.setRound({
        roundNumber: data.roundNumber,
        totalRounds: data.totalRounds,
        location: { lat: data.location.lat, lng: data.location.lng },
        totalPlayers: data.activePlayers.length,
      });
      playSound('click');
    });

    socket.on('game:playerGuessed', (data) => {
      game.updateGuessedCount(data.totalGuesses, data.totalPlayers);

      if (data.userId !== user.id) {
        toast(`${data.username} поставил метку`, {
          icon: '📍',
          duration: 2000,
        });
      }
    });

    socket.on('game:roundResults', (data) => {
      game.setRoundResults(data);
      game.setScores(data.scores);
      playSound('fanfare');
    });

    socket.on('game:finished', (data) => {
      game.setFinalResults(data);
      playSound('fanfare');
    });

    socket.on('error', (data) => {
      toast.error(data.message);
    });

    // Cleanup
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

      // Покидаем комнату
      socket.emit('room:leave');
      game.resetGame();

      if (roundTimerRef.current) {
        clearTimeout(roundTimerRef.current);
      }
    };
  }, [socket, roomCode, user.id]);

  // --- Игровые действия ---

  /**
   * Начать игру (только хост)
   */
  const startGame = useCallback(() => {
    if (!socket || !game.isHost) return;
    socket.emit('game:start', { code: roomCode });
  }, [socket, roomCode, game.isHost]);

  /**
   * Отправить предположение
   */
  const submitGuess = useCallback((lat, lng) => {
    if (!socket || !game.gameId || game.hasGuessed) return;

    const timeSpent = game.getTimeSpent();

    socket.emit('game:guess', {
      gameId: game.gameId,
      lat,
      lng,
      timeSpent,
    });

    game.setHasGuessed(true);
    playSound('click');
    toast.success('📍 Метка поставлена! Ожидаем остальных...');
  }, [socket, game.gameId, game.hasGuessed, game.getTimeSpent, playSound]);

  /**
   * Время вышло (только хост)
   */
  const handleTimeUp = useCallback(() => {
    if (!socket || !game.isHost || !game.gameId) return;
    socket.emit('game:timeUp', { gameId: game.gameId });
    playSound('wrong');
  }, [socket, game.isHost, game.gameId, playSound]);

  /**
   * Следующий раунд (только хост)
   */
  const nextRound = useCallback(() => {
    if (!socket || !game.isHost || !game.gameId) return;
    socket.emit('game:nextRound', { gameId: game.gameId });
  }, [socket, game.isHost, game.gameId]);

  /**
   * Готовность игрока
   */
  const toggleReady = useCallback(() => {
    if (!socket) return;
    socket.emit('room:ready', { code: roomCode });
  }, [socket, roomCode]);

  /**
   * Обновить настройки (только хост)
   */
  const updateSettings = useCallback((newSettings) => {
    if (!socket || !game.isHost) return;
    socket.emit('room:updateSettings', {
      code: roomCode,
      settings: newSettings,
    });
  }, [socket, roomCode, game.isHost]);

  /**
   * Покинуть комнату
   */
  const leaveRoom = useCallback(() => {
    if (socket) {
      socket.emit('room:leave');
    }
    game.resetGame();
  }, [socket]);

  return {
    // Состояние
    ...game,

    // Действия
    startGame,
    submitGuess,
    handleTimeUp,
    nextRound,
    toggleReady,
    updateSettings,
    leaveRoom,
  };
};
