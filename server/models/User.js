const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Введите имя пользователя'],
    unique: true,
    trim: true,
    minlength: [3, 'Минимум 3 символа'],
    maxlength: [20, 'Максимум 20 символов'],
  },
  email: {
    type: String,
    required: [true, 'Введите email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Некорректный email'],
  },
  password: {
    type: String,
    required: [true, 'Введите пароль'],
    minlength: [6, 'Минимум 6 символов'],
    select: false,
  },
  avatar: {
    type: String,
    default: '',
  },
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },
    totalRounds: { type: Number, default: 0 },
    correctGuesses: { type: Number, default: 0 },
    averageDistance: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 },
    bestRoundScore: { type: Number, default: 0 },
    winStreak: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    // Для тепловой карты
    guessHistory: [{
      actualLat: Number,
      actualLng: Number,
      guessLat: Number,
      guessLng: Number,
      distance: Number,
      score: Number,
      timestamp: { type: Date, default: Date.now },
    }],
  },
  achievements: [{
    name: String,
    description: String,
    unlockedAt: { type: Date, default: Date.now },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Хэширование пароля
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Проверка пароля
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Генерация JWT
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });
};

module.exports = mongoose.model('User', userSchema);
