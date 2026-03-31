/**
 * Клиентские утилиты и хелперы
 */

/**
 * Форматирование расстояния
 */
export function formatDistance(km) {
  if (km === null || km === undefined) return '—';
  if (km < 0) return 'Нет ответа';
  if (km < 0.001) return '< 1 м';
  if (km < 0.01) return `${Math.round(km * 1000)} м`;
  if (km < 1) return `${(km * 1000).toFixed(0)} м`;
  if (km < 10) return `${km.toFixed(1)} км`;
  if (km < 100) return `${km.toFixed(0)} км`;
  return `${Math.round(km).toLocaleString('ru-RU')} км`;
}

/**
 * Форматирование времени MM:SS
 */
export function formatTime(seconds) {
  if (seconds < 0 || seconds === null || seconds === undefined) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Форматирование длительности
 */
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '—';
  if (seconds < 60) return `${seconds} сек`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins} мин ${secs} сек` : `${mins} мин`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours} ч ${remMins} мин` : `${hours} ч`;
}

/**
 * Форматирование даты
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Форматирование даты и времени
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Относительное время ("2 часа назад")
 */
export function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 10) return 'только что';
  if (diff < 60) return `${diff} сек назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} дн назад`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)} нед назад`;
  return formatDate(dateStr);
}

/**
 * Копирование в буфер обмена
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback для старых браузеров
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (e) {
    console.error('Copy failed:', e);
    return false;
  }
}

/**
 * Debounce функция
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle функция
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

/**
 * Генерация цвета из строки (для аватаров)
 */
export function stringToColor(str) {
  if (!str) return '#667eea';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

/**
 * Получение инициалов из имени
 */
export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Перемешивание массива
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Уникальные значения массива по ключу
 */
export function uniqueBy(array, key) {
  const seen = new Set();
  return array.filter(item => {
    const value = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/**
 * Класс-хелпер для CSS
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Безопасный JSON parse
 */
export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Проверка мобильного устройства
 */
export function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Проверка touch-устройства
 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Полноэкранный режим
 */
export function toggleFullscreen(element = document.documentElement) {
  if (!document.fullscreenElement) {
    element.requestFullscreen?.() ||
    element.webkitRequestFullscreen?.() ||
    element.mozRequestFullScreen?.();
  } else {
    document.exitFullscreen?.() ||
    document.webkitExitFullscreen?.() ||
    document.mozCancelFullScreen?.();
  }
}

/**
 * Номер с разрядами (1234567 → "1 234 567")
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Math.round(num).toLocaleString('ru-RU');
}

/**
 * Процент с одним знаком (0.756 → "75.6%")
 */
export function formatPercent(value, total) {
  if (!total || total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

/**
 * Эмоджи для позиции в рейтинге
 */
export function getRankEmoji(rank) {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    default: return `#${rank}`;
  }
}

/**
 * Эмоджи для режима игры
 */
export function getModeEmoji(mode) {
  const map = {
    classic: '🎯',
    solo: '🧑',
    duel: '⚔️',
    battle_royale: '👑',
    team: '👥',
    blitz: '⚡',
  };
  return map[mode] || '🎯';
}

/**
 * Название режима игры
 */
export function getModeName(mode) {
  const map = {
    classic: 'Классический',
    solo: 'Соло',
    duel: 'Дуэль',
    battle_royale: 'Battle Royale',
    team: 'Команды',
    blitz: 'Блиц',
  };
  return map[mode] || mode;
}

/**
 * Задержка (для async/await)
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
