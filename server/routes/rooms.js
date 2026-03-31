const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// GET /api/rooms - Список публичных комнат
router.get('/', protect, async (req, res) => {
  try {
    const rooms = await Room.find({
      isPrivate: false,
      status: 'waiting',
    }).populate('host', 'username');

    res.json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/rooms - Создать комнату
router.post('/', protect, async (req, res) => {
  try {
    const {
      name, isPrivate, password, maxPlayers, settings,
    } = req.body;

    const code = uuidv4().substring(0, 6).toUpperCase();

    const room = await Room.create({
      code,
      name: name || `Комната ${code}`,
      host: req.user._id,
      players: [{
        userId: req.user._id,
        username: req.user.username,
        isReady: true,
      }],
      maxPlayers: maxPlayers || 10,
      isPrivate: isPrivate || false,
      password: password || null,
      settings: settings || {},
    });

    res.status(201).json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/rooms/:code
router.get('/:code', protect, async (req, res) => {
  try {
    const room = await Room.findOne({ code: req.params.code })
      .populate('host', 'username');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Комната не найдена' });
    }

    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
