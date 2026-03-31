const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    isReady: { type: Boolean, default: false },
    team: String,
  }],
  maxPlayers: { type: Number, default: 10 },
  isPrivate: { type: Boolean, default: false },
  password: String,
  settings: {
    rounds: { type: Number, default: 5, min: 1, max: 20 },
    timeLimit: { type: Number, default: 120, min: 10, max: 600 },
    mapProvider: { type: String, default: 'google' },
    gameMode: { type: String, default: 'classic' },
    coordinateSet: { type: String, default: 'world' },
    movementAllowed: { type: Boolean, default: true },
    zoomAllowed: { type: Boolean, default: true },
    compassAllowed: { type: Boolean, default: true },
  },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'finished'],
    default: 'waiting',
  },
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
  createdAt: { type: Date, default: Date.now },
});

// Автоудаление через 24 часа
roomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Room', roomSchema);
