const Game = require('../models/Game');
const Room = require('../models/Room');
const User = require('../models/User');
const { calculateDistance, calculateScore, speedBonus } = require('../utils/scoring');
const fs = require('fs');
const path = require('path');

module.exports = (io, socket) => {
  // Начало игры
  socket.on('game:start', async (data) => {
    try {
      const { code } = data;
      const room = await Room.findOne({ code });

      if (!room) {
        return socket.emit('error', { message: 'Комната не найдена' });
      }

      if (room.host.toString() !== socket.userData.userId) {
        return socket.emit('error', { message: 'Только хост может начать игру' });
      }

      // Загружаем координаты
      const setId = room.settings.coordinateSet || 'world';
      const filePath = path.join(__dirname, '..', 'data', `coordinates_${setId}.json`);
      let coordinates;

      try {
        coordinates = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        // Fallback на мировые координаты
        const defaultPath = path.join(__dirname, '..', 'data', 'coordinates_world.json');
        coordinates = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
      }

      // Выбираем случайные локации для раундов
      const roundCount = room.settings.rounds || 5;
      const shuffled = coordinates.locations.sort(() => Math.random() - 0.5);
      const selectedLocations = shuffled.slice(0, Math.min(roundCount, shuffled.length));

      // Создаём раунды
      const rounds = selectedLocations.map((loc, idx) => ({
        roundNumber: idx + 1,
        location: {
          lat: loc.lat,
          lng: loc.lng,
          name: loc.name,
          country: loc.country,
          hint: loc.hint || '',
        },
        guesses: [],
        startedAt: null,
        endedAt: null,
      }));

      // Создаём игру
      const game = await Game.create({
        roomCode: code,
        host: room.host,
        players: room.players.map(p => ({
          userId: p.userId,
          username: p.username,
          totalScore: 0,
          isActive: true,
          team: p.team || null,
        })),
        settings: room.settings,
        rounds,
        currentRound: 0,
        status: 'playing',
        startedAt: new Date(),
      });

      // Обновляем комнату
      room.status = 'playing';
      room.gameId = game._id;
      await room.save();

      io.to(code).emit('game:started', {
        gameId: game._id,
        settings: room.settings,
        totalRounds: rounds.length,
        players: game.players,
      });

      // Начинаем первый раунд
      startRound(io, code, game._id, 0);

    } catch (error) {
      console.error('Game start error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Отправка предположения
  socket.on('game:guess', async (data) => {
    try {
      const { gameId, lat, lng, timeSpent } = data;
      const game = await Game.findById(gameId);

      if (!game || game.status !== 'playing') return;

      const currentRound = game.rounds[game.currentRound];
      if (!currentRound) return;

      // Проверяем, не отправил ли уже
      const alreadyGuessed = currentRound.guesses.some(
        g => g.playerId.toString() === socket.userData.userId
      );
      if (alreadyGuessed) return;

      // Рассчитываем расстояние и очки
      const distance = calculateDistance(
        currentRound.location.lat,
        currentRound.location.lng,
        lat, lng
      );

      let score = calculateScore(distance);

      // Бонус за скорость
      const timeLimit = game.settings.timeLimit || 120;
      const bonus = speedBonus(timeSpent, timeLimit);

      // В блиц-режиме бонус за скорость больше
      if (game.settings.gameMode === 'blitz') {
        score += bonus * 2;
      } else {
        score += bonus;
      }

      currentRound.guesses.push({
        playerId: socket.userData.userId,
        playerName: socket.userData.username,
        lat,
        lng,
        distance: Math.round(distance * 100) / 100,
        score,
        timeSpent,
        submittedAt: new Date(),
      });

      // Обновляем общий счёт игрока
      const player = game.players.find(
        p => p.userId.toString() === socket.userData.userId
      );
      if (player) {
        player.totalScore += score;
      }

      await game.save();

      // Уведомляем, что игрок поставил метку (без координат!)
      const code = game.roomCode;
      io.to(code).emit('game:playerGuessed', {
        userId: socket.userData.userId,
        username: socket.userData.username,
        roundNumber: currentRound.roundNumber,
        // НЕ передаём координаты - они скрыты пока все не ответят
        totalGuesses: currentRound.guesses.length,
        totalPlayers: game.players.filter(p => p.isActive).length,
      });

      // Проверяем, все ли ответили
      const activePlayers = game.players.filter(p => p.isActive);
      if (currentRound.guesses.length >= activePlayers.length) {
        // Все ответили — показываем результаты раунда
        await showRoundResults(io, code, gameId, game.currentRound);
      }

    } catch (error) {
      console.error('Guess error:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Таймер истёк
  socket.on('game:timeUp', async (data) => {
    try {
      const { gameId } = data;
      const game = await Game.findById(gameId);
      if (!game) return;

      // Только хост может триггерить таймаут
      if (game.host.toString() !== socket.userData.userId) return;

      const currentRound = game.rounds[game.currentRound];
      if (!currentRound) return;

      // Добавляем нулевые очки для тех, кто не ответил
      const activePlayers = game.players.filter(p => p.isActive);
      for (const player of activePlayers) {
        const hasGuessed = currentRound.guesses.some(
          g => g.playerId.toString() === player.userId.toString()
        );
        if (!hasGuessed) {
          currentRound.guesses.push({
            playerId: player.userId,
            playerName: player.username,
            lat: 0,
            lng: 0,
            distance: -1, // не ответил
            score: 0,
            timeSpent: game.settings.timeLimit,
            submittedAt: new Date(),
          });
        }
      }

      await game.save();
      await showRoundResults(io, game.roomCode, gameId, game.currentRound);

    } catch (error) {
      console.error('TimeUp error:', error);
    }
  });

  // Следующий раунд
  socket.on('game:nextRound', async (data) => {
    try {
      const { gameId } = data;
      const game = await Game.findById(gameId);
      if (!game) return;

      if (game.host.toString() !== socket.userData.userId) return;

      const nextRound = game.currentRound + 1;

      if (nextRound >= game.rounds.length) {
        // Игра окончена
        await finishGame(io, game.roomCode, gameId);
      } else {
        // Battle Royale: исключаем худшего
        if (game.settings.gameMode === 'battle_royale' && game.currentRound > 0) {
          await eliminateWorstPlayer(game);
        }

        game.currentRound = nextRound;
        await game.save();

        startRound(io, game.roomCode, gameId, nextRound);
      }

    } catch (error) {
      console.error('Next round error:', error);
    }
  });
};

// --- Вспомогательные функции ---

async function startRound(io, roomCode, gameId, roundIndex) {
  const game = await Game.findById(gameId);
  if (!game) return;

  const round = game.rounds[roundIndex];
  round.startedAt = new Date();
  await game.save();

  io.to(roomCode).emit('game:roundStart', {
    roundNumber: round.roundNumber,
    totalRounds: game.rounds.length,
    location: {
      lat: round.location.lat,
      lng: round.location.lng,
      // НЕ отправляем name, country, hint сразу
    },
    timeLimit: game.settings.timeLimit,
    settings: {
      movementAllowed: game.settings.movementAllowed,
      zoomAllowed: game.settings.zoomAllowed,
      compassAllowed: game.settings.compassAllowed,
      mapProvider: game.settings.mapProvider,
    },
    activePlayers: game.players.filter(p => p.isActive).map(p => ({
      userId: p.userId,
      username: p.username,
    })),
  });
}

async function showRoundResults(io, roomCode, gameId, roundIndex) {
  const game = await Game.findById(gameId);
  if (!game) return;

  const round = game.rounds[roundIndex];
  round.endedAt = new Date();
  game.status = 'round_results';
  await game.save();

  // Обновляем статистику пользователей
  for (const guess of round.guesses) {
    try {
      await User.findByIdAndUpdate(guess.playerId, {
        $inc: {
          'stats.totalRounds': 1,
          'stats.totalScore': guess.score,
          'stats.totalDistance': guess.distance > 0 ? guess.distance : 0,
          'stats.correctGuesses': guess.distance >= 0 && guess.distance < 50 ? 1 : 0,
        },
        $push: {
          'stats.guessHistory': {
            $each: [{
              actualLat: round.location.lat,
              actualLng: round.location.lng,
              guessLat: guess.lat,
              guessLng: guess.lng,
              distance: guess.distance,
              score: guess.score,
            }],
            $slice: -500, // Храним последние 500 записей
          },
        },
      });
    } catch (e) {
      console.error('Stats update error:', e);
    }
  }

  // Теперь отправляем ВСЕ метки всех игроков
  io.to(roomCode).emit('game:roundResults', {
    roundNumber: round.roundNumber,
    location: round.location, // Теперь показываем полную информацию
    guesses: round.guesses.map(g => ({
      playerId: g.playerId,
      playerName: g.playerName,
      lat: g.lat,
      lng: g.lng,
      distance: g.distance,
      score: g.score,
      timeSpent: g.timeSpent,
    })),
    scores: game.players.map(p => ({
      userId: p.userId,
      username: p.username,
      totalScore: p.totalScore,
      isActive: p.isActive,
    })).sort((a, b) => b.totalScore - a.totalScore),
    isLastRound: roundIndex >= game.rounds.length - 1,
  });
}

async function eliminateWorstPlayer(game) {
  const lastRound = game.rounds[game.currentRound];
  if (!lastRound || lastRound.guesses.length === 0) return;

  const activePlayers = game.players.filter(p => p.isActive);
  if (activePlayers.length <= 2) return; // Минимум 2 игрока

  // Находим худший результат в раунде
  let worstGuess = null;
  let worstScore = Infinity;

  for (const guess of lastRound.guesses) {
    if (guess.score < worstScore) {
      worstScore = guess.score;
      worstGuess = guess;
    }
  }

  if (worstGuess) {
    const player = game.players.find(
      p => p.userId.toString() === worstGuess.playerId.toString()
    );
    if (player) {
      player.isActive = false;
      game.eliminatedPlayers.push(player.userId);
    }
  }

  await game.save();
}

async function finishGame(io, roomCode, gameId) {
  const game = await Game.findById(gameId);
  if (!game) return;

  game.status = 'finished';
  game.finishedAt = new Date();
  await game.save();

  // Определяем победителя
  const sortedPlayers = [...game.players]
    .filter(p => p.isActive || game.settings.gameMode !== 'battle_royale')
    .sort((a, b) => b.totalScore - a.totalScore);

  const winner = sortedPlayers[0];

  // Обновляем статистику победителя
  if (winner) {
    await User.findByIdAndUpdate(winner.userId, {
      $inc: {
        'stats.gamesWon': 1,
        'stats.gamesPlayed': 1,
        'stats.currentStreak': 1,
      },
    });

    // Обновляем статистику остальных
    for (const player of sortedPlayers.slice(1)) {
      await User.findByIdAndUpdate(player.userId, {
        $inc: { 'stats.gamesPlayed': 1 },
        $set: { 'stats.currentStreak': 0 },
      });
    }
  }

  // Обновляем комнату
  await Room.findOneAndUpdate(
    { code: roomCode },
    { status: 'finished' }
  );

  io.to(roomCode).emit('game:finished', {
    winner: winner ? {
      userId: winner.userId,
      username: winner.username,
      totalScore: winner.totalScore,
    } : null,
    finalScores: sortedPlayers.map((p, idx) => ({
      rank: idx + 1,
      userId: p.userId,
      username: p.username,
      totalScore: p.totalScore,
    })),
    rounds: game.rounds.map(r => ({
      roundNumber: r.roundNumber,
      location: r.location,
      guesses: r.guesses,
    })),
  });
}
