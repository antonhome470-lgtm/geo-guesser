const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
  roundNumber: Number,
  location: {
    lat: Number,
    lng: Number,
    name: String,
    country: String,
    hint: String,
  },
  guesses: [{
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    playerName: String,
    lat: Number,
    lng: Number,
    distance: Number,
    score: Number,
    timeSpent: Number, // секунды
    submittedAt: Date,
  }],
  startedAt: Date,
  endedAt: Date,
});

const gameSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  players: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    totalScore: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    team: { type: String, default: null }, // Для командного режима
  }],
  settings: {
    rounds: { type: Number, default: 5 },
    timeLimit: { type: Number, default: 120 }, // секунды
    mapProvider: { type: String, default: 'google' },
    gameMode: {
      type: String,
      enum: ['classic', 'solo', 'duel', 'battle_royale', 'team', 'blitz'],
      default: 'classic',
    },
    coordinateSet: { type: String, default: 'world' },
    movementAllowed: { type: Boolean, default: true },
    zoomAllowed: { type: Boolean, default: true },
    compassAllowed: { type: Boolean, default: true },
  },
  rounds: [roundSchema],
  currentRound: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['waiting', 'playing', 'round_results', 'finished'],
    default: 'waiting',
  },
  eliminatedPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  finishedAt: Date,
});

module.exports = mongoose.model('Game', gameSchema);
