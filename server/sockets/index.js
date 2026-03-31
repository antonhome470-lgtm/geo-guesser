const { socketAuth } = require('../middleware/auth');
const gameSocket = require('./gameSocket');
const roomSocket = require('./roomSocket');

module.exports = (io) => {
  // Middleware для аутентификации
  io.use(socketAuth);

  io.on('connection', (socket) => {
    console.log(`🟢 Пользователь подключен: ${socket.user.username} (${socket.id})`);

    // Сохраняем информацию о пользователе
    socket.userData = {
      userId: socket.user._id.toString(),
      username: socket.user.username,
    };

    // Подключаем обработчики
    roomSocket(io, socket);
    gameSocket(io, socket);

    // Отключение
    socket.on('disconnect', () => {
      console.log(`🔴 Пользователь отключен: ${socket.user.username}`);
    });
  });
};
