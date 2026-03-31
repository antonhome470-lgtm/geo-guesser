const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/users/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find()
      .select('username stats.totalScore stats.gamesWon stats.gamesPlayed stats.bestScore')
      .sort({ 'stats.totalScore': -1 })
      .limit(50);

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/:id/stats
router.get('/:id/stats', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username stats achievements createdAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Пользователь не найден' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/me/heatmap
router.get('/me/heatmap', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('stats.guessHistory');

    const heatmapData = user.stats.guessHistory.map(g => ({
      actual: { lat: g.actualLat, lng: g.actualLng },
      guess: { lat: g.guessLat, lng: g.guessLng },
      distance: g.distance,
      score: g.score,
    }));

    res.json({ success: true, data: heatmapData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
