const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

module.exports = (io, socket) => {
  // Создание комнаты
  socket.on('room:create', async (data) => {
    try {
      const code = uuidv4().substring(0, 6).toUpperCase();

      const room = await Room.create({
        code,
        name: data.name || `Комната ${code}`,
        host: socket.userData.userId,
        players: [{
          userId: socket.userData.userId,
          username: socket.userData.username,
          isReady: true,
        }],
        maxPlayers: data.maxPlayers || 10,
        isPrivate: data.isPrivate || false,
        password: data.password || null,
        settings: data.settings || {},
      });

      socket.join(code);
      socket.currentRoom = code;

      socket.emit('room:created', {
        success: true,
        room: room.toObject(),
      });

      // Обновляем список комнат для всех
      const rooms = await Room.find({ isPrivate: false, status: 'waiting' });
      io.emit('rooms:list', rooms);

    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Присоединение к комнате
  socket.on('room:join', async (data) => {
    try {
      const { code, password } = data;
      const room = await Room.findOne({ code });

      if (!room) {
        return socket.emit('error', { message: 'Комната не найдена' });
      }

      if (room.status !== 'waiting') {
        return socket.emit('error', { message: 'Игра уже идёт' });
      }

      if (room.players.length >= room.maxPlayers) {
        return socket.emit('error', { message: 'Комната заполнена' });
      }

      if (room.isPrivate && room.password && room.password !== password) {
        return socket.emit('error', { message: 'Неверный пароль' });
      }

      // Проверка, не в комнате ли уже
      const alreadyInRoom = room.players.some(
        p => p.userId.toString() === socket.userData.userId
      );

      if (!alreadyInRoom) {
        room.players.push({
          userId: socket.userData.userId,
          username: socket.userData.username,
          isReady: false,
        });
        await room.save();
      }

      socket.join(code);
      socket.currentRoom = code;

      socket.emit('room:joined', {
        success: true,
        room: room.toObject(),
      });

      // Уведомляем всех в комнате
      socket.to(code).emit('room:playerJoined', {
        player: {
          userId: socket.userData.userId,
          username: socket.userData.username,
        },
        players: room.players,
      });

    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Готовность игрока
  socket.on('room:ready', async (data) => {
    try {
      const { code } = data;
      const room = await Room.findOne({ code });

      if (!room) return;

      const player = room.players.find(
        p => p.userId.toString() === socket.userData.userId
      );

      if (player) {
        player.isReady = !player.isReady;
        await room.save();

        io.to(code).emit('room:updated', {
          players: room.players,
        });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Обновление настроек
  socket.on('room:updateSettings', async (data) => {
    try {
      const { code, settings } = data;
      const room = await Room.findOne({ code });

      if (!room) return;
      if (room.host.toString() !== socket.userData.userId) {
        return socket.emit('error', { message: 'Только хост может менять настройки' });
      }

      room.settings = { ...room.settings, ...settings };
      await room.save();

      io.to(code).emit('room:settingsUpdated', {
        settings: room.settings,
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Покинуть комнату
  socket.on('room:leave', async () => {
    try {
      const code = socket.currentRoom;
      if (!code) return;

      const room = await Room.findOne({ code });
      if (!room) return;

      room.players = room.players.filter(
        p => p.userId.toString() !== socket.userData.userId
      );

      if (room.players.length === 0) {
        await Room.deleteOne({ code });
      } else {
        // Если ушёл хост, передаём права
        if (room.host.toString() === socket.userData.userId) {
          room.host = room.players[0].userId;
        }
        await room.save();
      }

      socket.leave(code);
      socket.currentRoom = null;

      io.to(code).emit('room:playerLeft', {
        userId: socket.userData.userId,
        players: room.players,
        newHost: room.players.length > 0 ? room.players[0].userId : null,
      });

      // Обновляем список комнат
      const rooms = await Room.find({ isPrivate: false, status: 'waiting' });
      io.emit('rooms:list', rooms);

    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Получить список комнат
  socket.on('rooms:getList', async () => {
    try {
      const rooms = await Room.find({
        isPrivate: false,
        status: 'waiting',
      }).populate('host', 'username');

      socket.emit('rooms:list', rooms);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Отключение — автоматический выход
  socket.on('disconnect', async () => {
    if (socket.currentRoom) {
      const code = socket.currentRoom;
      try {
        const room = await Room.findOne({ code });
        if (room) {
          room.players = room.players.filter(
            p => p.userId.toString() !== socket.userData.userId
          );

          if (room.players.length === 0) {
            await Room.deleteOne({ code });
          } else {
            if (room.host.toString() === socket.userData.userId) {
              room.host = room.players[0].userId;
            }
            await room.save();
            io.to(code).emit('room:playerLeft', {
              userId: socket.userData.userId,
              players: room.players,
            });
          }
        }
      } catch (error) {
        console.error('Disconnect cleanup error:', error);
      }
    }
  });
};
