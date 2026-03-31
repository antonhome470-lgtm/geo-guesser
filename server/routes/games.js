const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/games — История игр текущего пользователя
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = {
      'players.userId': req.user._id,
    };

    if (status) {
      query.status = status;
    }

    const games = await Game.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('roomCode settings currentRound status players createdAt finishedAt')
      .populate('host', 'username');

    const total = await Game.countDocuments(query);

    // Добавляем информацию о результате для текущего пользователя
    const gamesWithResults = games.map(game => {
      const gameObj = game.toObject();
      const sortedPlayers = [...gameObj.players].sort((a, b) => b.totalScore - a.totalScore);
      const myPlayer = gameObj.players.find(
        p => p.userId.toString() === req.user._id.toString()
      );
      const myRank = sortedPlayers.findIndex(
        p => p.userId.toString() === req.user._id.toString()
      ) + 1;

      return {
        ...gameObj,
        myScore: myPlayer?.totalScore || 0,
        myRank,
        totalPlayers: gameObj.players.length,
        winner: sortedPlayers[0] || null,
        isWinner: myRank === 1,
      };
    });

    res.json({
      success: true,
      data: gamesWithResults,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/games/:id — Детали конкретной игры
router.get('/:id', protect, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('host', 'username');

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Игра не найдена',
      });
    }

    // Проверяем, участвовал ли пользователь
    const isParticipant = game.players.some(
      p => p.userId.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Вы не участвовали в этой игре',
      });
    }

    // Формируем подробную статистику по раундам
    const roundDetails = game.rounds.map(round => {
      const sortedGuesses = [...round.guesses].sort((a, b) => b.score - a.score);

      const myGuess = round.guesses.find(
        g => g.playerId.toString() === req.user._id.toString()
      );

      return {
        roundNumber: round.roundNumber,
        location: round.location,
        myGuess: myGuess ? {
          lat: myGuess.lat,
          lng: myGuess.lng,
          distance: myGuess.distance,
          score: myGuess.score,
          timeSpent: myGuess.timeSpent,
          rank: sortedGuesses.findIndex(
            g => g.playerId.toString() === req.user._id.toString()
          ) + 1,
        } : null,
        allGuesses: sortedGuesses.map((g, idx) => ({
          rank: idx + 1,
          playerName: g.playerName,
          playerId: g.playerId,
          distance: g.distance,
          score: g.score,
          timeSpent: g.timeSpent,
          lat: g.lat,
          lng: g.lng,
        })),
        bestGuess: sortedGuesses[0] || null,
        worstGuess: sortedGuesses[sortedGuesses.length - 1] || null,
        averageDistance: sortedGuesses.length > 0
          ? sortedGuesses.reduce((sum, g) => sum + (g.distance > 0 ? g.distance : 0), 0) / sortedGuesses.filter(g => g.distance > 0).length
          : 0,
        startedAt: round.startedAt,
        endedAt: round.endedAt,
      };
    });

    // Итоговый рейтинг
    const finalStandings = [...game.players]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((p, idx) => ({
        rank: idx + 1,
        userId: p.userId,
        username: p.username,
        totalScore: p.totalScore,
        isActive: p.isActive,
        team: p.team,
      }));

    // Статистика игры
    const allDistances = game.rounds
      .flatMap(r => r.guesses)
      .filter(g => g.distance > 0)
      .map(g => g.distance);

    const gameStats = {
      totalRounds: game.rounds.length,
      totalPlayers: game.players.length,
      averageDistance: allDistances.length > 0
        ? Math.round(allDistances.reduce((a, b) => a + b, 0) / allDistances.length)
        : 0,
      bestSingleGuess: allDistances.length > 0
        ? Math.round(Math.min(...allDistances) * 100) / 100
        : 0,
      worstSingleGuess: allDistances.length > 0
        ? Math.round(Math.max(...allDistances))
        : 0,
      totalScoreAllPlayers: game.players.reduce((sum, p) => sum + p.totalScore, 0),
      duration: game.finishedAt && game.startedAt
        ? Math.round((new Date(game.finishedAt) - new Date(game.startedAt)) / 1000)
        : null,
    };

    res.json({
      success: true,
      data: {
        id: game._id,
        roomCode: game.roomCode,
        host: game.host,
        settings: game.settings,
        status: game.status,
        rounds: roundDetails,
        finalStandings,
        eliminatedPlayers: game.eliminatedPlayers,
        gameStats,
        createdAt: game.createdAt,
        startedAt: game.startedAt,
        finishedAt: game.finishedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/games/:id/screenshots — Данные для скриншотов раундов
router.get('/:id/screenshots', protect, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Игра не найдена',
      });
    }

    const isParticipant = game.players.some(
      p => p.userId.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Вы не участвовали в этой игре',
      });
    }

    // Формируем данные для визуализации каждого раунда
    const screenshots = game.rounds.map(round => ({
      roundNumber: round.roundNumber,
      location: {
        lat: round.location.lat,
        lng: round.location.lng,
        name: round.location.name,
        country: round.location.country,
      },
      guesses: round.guesses.map(g => ({
        playerName: g.playerName,
        lat: g.lat,
        lng: g.lng,
        distance: g.distance,
        score: g.score,
      })),
      // URL для Static Map API (Google)
      mapUrl: generateStaticMapUrl(round),
    }));

    res.json({ success: true, data: screenshots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/games/stats/summary — Общая статистика по всем играм пользователя
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const games = await Game.find({
      'players.userId': userId,
      status: 'finished',
    });

    if (games.length === 0) {
      return res.json({
        success: true,
        data: {
          totalGames: 0,
          wins: 0,
          winRate: 0,
          totalScore: 0,
          averageScore: 0,
          bestGame: null,
          favoriteMode: null,
          recentGames: [],
        },
      });
    }

    let wins = 0;
    let totalScore = 0;
    let bestGameScore = 0;
    let bestGame = null;
    const modeCounts = {};
    const setCounts = {};

    games.forEach(game => {
      const sorted = [...game.players].sort((a, b) => b.totalScore - a.totalScore);
      const myPlayer = game.players.find(
        p => p.userId.toString() === userId.toString()
      );

      if (!myPlayer) return;

      totalScore += myPlayer.totalScore;

      if (sorted[0]?.userId.toString() === userId.toString()) {
        wins++;
      }

      if (myPlayer.totalScore > bestGameScore) {
        bestGameScore = myPlayer.totalScore;
        bestGame = {
          gameId: game._id,
          score: myPlayer.totalScore,
          date: game.finishedAt,
          mode: game.settings.gameMode,
        };
      }

      // Считаем популярные режимы
      const mode = game.settings.gameMode;
      modeCounts[mode] = (modeCounts[mode] || 0) + 1;

      const set = game.settings.coordinateSet;
      setCounts[set] = (setCounts[set] || 0) + 1;
    });

    const favoriteMode = Object.entries(modeCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    const favoriteSet = Object.entries(setCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    // Последние 5 игр
    const recentGames = games
      .sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt))
      .slice(0, 5)
      .map(game => {
        const sorted = [...game.players].sort((a, b) => b.totalScore - a.totalScore);
        const myPlayer = game.players.find(
          p => p.userId.toString() === userId.toString()
        );
        const myRank = sorted.findIndex(
          p => p.userId.toString() === userId.toString()
        ) + 1;

        return {
          gameId: game._id,
          mode: game.settings.gameMode,
          coordinateSet: game.settings.coordinateSet,
          myScore: myPlayer?.totalScore || 0,
          myRank,
          totalPlayers: game.players.length,
          isWin: myRank === 1,
          date: game.finishedAt,
        };
      });

    res.json({
      success: true,
      data: {
        totalGames: games.length,
        wins,
        winRate: Math.round((wins / games.length) * 100 * 10) / 10,
        totalScore,
        averageScore: Math.round(totalScore / games.length),
        bestGame,
        favoriteMode,
        favoriteSet,
        modeDistribution: modeCounts,
        setDistribution: setCounts,
        recentGames,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/games/:id — Удалить игру (только хост)
router.delete('/:id', protect, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Игра не найдена',
      });
    }

    if (game.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Только хост может удалить игру',
      });
    }

    await Game.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Игра удалена',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Генерация URL для Static Map (для скриншотов)
 */
function generateStaticMapUrl(round) {
  const apiKey = process.env.GOOGLE_MAPS_KEY;
  if (!apiKey) return null;

  const markers = [];

  // Маркер правильного ответа (зелёный)
  markers.push(
    `markers=color:green|label:✓|${round.location.lat},${round.location.lng}`
  );

  // Маркеры игроков
  const colors = ['red', 'blue', 'yellow', 'purple', 'orange'];
  round.guesses.forEach((guess, idx) => {
    if (guess.distance < 0) return; // не ответил
    const color = colors[idx % colors.length];
    const label = guess.playerName.charAt(0).toUpperCase();
    markers.push(
      `markers=color:${color}|label:${label}|${guess.lat},${guess.lng}`
    );
  });

  const markersStr = markers.join('&');

  return `https://maps.googleapis.com/maps/api/staticmap?size=800x400&maptype=terrain&${markersStr}&key=${apiKey}`;
}

module.exports = router;
