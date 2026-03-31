/**
 * Расчёт расстояния между двумя точками (формула Хаверсина)
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Форматирование расстояния
 */
export function formatDistance(km) {
  if (km < 0) return 'Не ответил';
  if (km < 1) return `${Math.round(km * 1000)} м`;
  if (km < 100) return `${km.toFixed(1)} км`;
  return `${Math.round(km)} км`;
}

/**
 * Форматирование времени
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
