const config = require('../config/config');

/**
 * Расчёт расстояния между двумя точками (формула Хаверсина)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Радиус Земли в км
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
 * Расчёт очков за раунд
 * Максимум 5000 очков при точном попадании
 * Экспоненциальное убывание
 */
function calculateScore(distance) {
  const maxScore = config.SCORING.MAX_SCORE;
  const maxDistance = config.SCORING.ZERO_SCORE_DISTANCE;

  if (distance <= 0.05) return maxScore; // Меньше 50м - идеально
  if (distance >= maxDistance) return 0;

  // Экспоненциальная формула (как в оригинальном GeoGuessr)
  const score = Math.round(maxScore * Math.exp(-distance / (maxDistance / 10)));
  return Math.max(0, Math.min(maxScore, score));
}

/**
 * Бонусные очки за скорость
 */
function speedBonus(timeSpent, timeLimit) {
  const ratio = 1 - (timeSpent / timeLimit);
  if (ratio <= 0) return 0;
  return Math.round(ratio * 500); // До 500 бонусных очков
}

module.exports = { calculateDistance, calculateScore, speedBonus };
