const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Необходима авторизация',
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Пользователь не найден',
      });
    }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Невалидный токен',
    });
  }
};

// Аутентификация для Socket.IO
const socketAuth = async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Необходима авторизация'));
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new Error('Пользователь не найден'));
    }
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Невалидный токен'));
  }
};

module.exports = { protect, socketAuth };
