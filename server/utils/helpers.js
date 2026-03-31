const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

/**
 * Генерация уникального кода комнаты (6 символов)
 */
function generateRoomCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без похожих: 0/O, 1/I/L
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Перемешивание массива (Fisher-Yates shuffle)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Выбрать N случайных элементов из массива
 */
function pickRandom(array, count) {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Форматирование расстояния для отображения
 */
function formatDistance(km) {
  if (km < 0) return 'Нет ответа';
  if (km < 0.05) return 'Точное попадание!';
  if (km < 1) return `${Math.round(km * 1000)} м`;
  if (km < 10) return `${km.toFixed(1)} км`;
  if (km < 100) return `${km.toFixed(0)} км`;
  return `${Math.round(km).toLocaleString('ru-RU')} км`;
}

/**
 * Форматирование времени (секунды → MM:SS)
 */
function formatTime(seconds) {
  if (seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Форматирование длительности (секунды → человекочитаемый)
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '—';
  if (seconds < 60) return `${seconds} сек`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins} мин ${secs} сек` : `${mins} мин`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
}

/**
 * Валидация координат
 */
function isValidCoordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Валидация настроек игры
 */
function validateGameSettings(settings) {
  const errors = [];
  const validModes = Object.values(config.GAME_MODES);
  const validProviders = Object.values(config.MAP_PROVIDERS);

  if (settings.rounds !== undefined) {
    if (settings.rounds < 1 || settings.rounds > 20) {
      errors.push('Количество раундов должно быть от 1 до 20');
    }
  }

  if (settings.timeLimit !== undefined) {
    if (settings.timeLimit < 10 || settings.timeLimit > 600) {
      errors.push('Лимит времени должен быть от 10 до 600 секунд');
    }
  }

  if (settings.gameMode && !validModes.includes(settings.gameMode)) {
    errors.push(`Недопустимый режим игры. Доступные: ${validModes.join(', ')}`);
  }

  if (settings.mapProvider && !validProviders.includes(settings.mapProvider)) {
    errors.push(`Недопустимый провайдер карт. Доступные: ${validProviders.join(', ')}`);
  }

  if (settings.maxPlayers !== undefined) {
    if (settings.maxPlayers < 1 || settings.maxPlayers > config.MAX_PLAYERS_PER_ROOM) {
      errors.push(`Максимум игроков: от 1 до ${config.MAX_PLAYERS_PER_ROOM}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Валидация режима для количества игроков
 */
function validateModeForPlayers(mode, playerCount) {
  switch (mode) {
    case 'solo':
      if (playerCount > 1) return { valid: false, message: 'Соло-режим только для 1 игрока' };
      break;
    case 'duel':
      if (playerCount !== 2) return { valid: false, message: 'Дуэль только для 2 игроков' };
      break;
    case 'battle_royale':
      if (playerCount < 3) return { valid: false, message: 'Battle Royale минимум 3 игрока' };
      break;
    case 'team':
      if (playerCount < 4) return { valid: false, message: 'Командный режим минимум 4 игрока' };
      if (playerCount % 2 !== 0) return { valid: false, message: 'Нужно чётное количество игроков для команд' };
      break;
  }
  return { valid: true };
}

/**
 * Распределение игроков по командам
 */
function assignTeams(players, teamSize = 2) {
  const shuffled = shuffleArray(players);
  const teams = [];
  const teamNames = ['Красные', 'Синие', 'Зелёные', 'Жёлтые', 'Фиолетовые'];
  let teamIndex = 0;

  for (let i = 0; i < shuffled.length; i += teamSize) {
    const team = shuffled.slice(i, i + teamSize);
    const teamName = teamNames[teamIndex % teamNames.length];
    team.forEach(player => {
      player.team = teamName;
    });
    teams.push({
      name: teamName,
      players: team,
    });
    teamIndex++;
  }

  return { players: shuffled, teams };
}

/**
 * Определение достижений после игры
 */
function checkAchievements(userStats, gameResult) {
  const newAchievements = [];

  // Первая игра
  if (userStats.gamesPlayed === 1) {
    newAchievements.push({
      name: '🎮 Новичок',
      description: 'Сыграйте первую игру',
    });
  }

  // Первая победа
  if (userStats.gamesWon === 1) {
    newAchievements.push({
      name: '🏆 Первая победа',
      description: 'Выиграйте свою первую игру',
    });
  }

  // 10 побед
  if (userStats.gamesWon === 10) {
    newAchievements.push({
      name: '⭐ Ветеран',
      description: 'Одержите 10 побед',
    });
  }

  // 50 побед
  if (userStats.gamesWon === 50) {
    newAchievements.push({
      name: '💎 Мастер',
      description: 'Одержите 50 побед',
    });
  }

  // Серия побед
  if (userStats.currentStreak === 3) {
    newAchievements.push({
      name: '🔥 Серия',
      description: 'Выиграйте 3 игры подряд',
    });
  }

  if (userStats.currentStreak === 10) {
    newAchievements.push({
      name: '💥 Неудержимый',
      description: 'Выиграйте 10 игр подряд',
    });
  }

  // Идеальное попадание (менее 50м)
  if (gameResult && gameResult.bestDistance < 0.05) {
    newAchievements.push({
      name: '🎯 Снайпер',
      description: 'Угадайте с точностью менее 50 метров',
    });
  }

  // Максимальный счёт за раунд
  if (gameResult && gameResult.bestRoundScore >= 5000) {
    newAchievements.push({
      name: '💯 Перфекционист',
      description: 'Наберите максимальные 5000 очков за раунд',
    });
  }

  // 100 раундов
  if (userStats.totalRounds === 100) {
    newAchievements.push({
      name: '🌍 Путешественник',
      description: 'Сыграйте 100 раундов',
    });
  }

  // 500 раундов
  if (userStats.totalRounds === 500) {
    newAchievements.push({
      name: '🗺️ Исследователь',
      description: 'Сыграйте 500 раундов',
    });
  }

  // 100 000 очков суммарно
  if (userStats.totalScore >= 100000 && (userStats.totalScore - (gameResult?.totalGameScore || 0)) < 100000) {
    newAchievements.push({
      name: '💰 Коллекционер',
      description: 'Наберите 100 000 очков суммарно',
    });
  }

  return newAchievements;
}

/**
 * Безопасное обрезание строки
 */
function truncate(str, maxLength = 50) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Задержка (Promise-based)
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Генерация цвета из строки (для аватаров)
 */
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

/**
 * Вычисление медианы массива
 */
function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Группировка массива по ключу
 */
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = typeof key === 'function' ? key(item) : item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
}

/**
 * Безопасный JSON parse
 */
function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Логирование с временной меткой
 */
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📘',
    warn: '⚠️',
    error: '🔴',
    debug: '🔧',
    game: '🎮',
    socket: '🔌',
  }[level] || '📝';

  const logMessage = `[${timestamp}] ${prefix} ${message}`;

  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
}

module.exports = {
  generateRoomCode,
  shuffleArray,
  pickRandom,
  formatDistance,
  formatTime,
  formatDuration,
  isValidCoordinates,
  validateGameSettings,
  validateModeForPlayers,
  assignTeams,
  checkAchievements,
  truncate,
  sleep,
  stringToColor,
  median,
  groupBy,
  safeJsonParse,
  log,
};
