/**
 * Клиентская утилита для расчёта очков
 * Дублирует серверную логику для предварительного отображения
 */

const MAX_SCORE = 5000;
const ZERO_SCORE_DISTANCE = 15000; // км

/**
 * Расчёт расстояния по формуле Хаверсина
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
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
 * Экспоненциальное убывание: 5000 при 0 км → 0 при 15000 км
 */
export function calculateScore(distanceKm) {
  if (distanceKm <= 0.05) return MAX_SCORE; // <50 м = идеально
  if (distanceKm >= ZERO_SCORE_DISTANCE) return 0;

  const score = Math.round(
    MAX_SCORE * Math.exp(-distanceKm / (ZERO_SCORE_DISTANCE / 10))
  );

  return Math.max(0, Math.min(MAX_SCORE, score));
}

/**
 * Бонус за скорость ответа
 */
export function calculateSpeedBonus(timeSpent, timeLimit) {
  const ratio = 1 - (timeSpent / timeLimit);
  if (ratio <= 0) return 0;
  return Math.round(ratio * 500); // До 500 бонусных очков
}

/**
 * Полный расчёт очков за раунд
 */
export function calculateRoundScore(actualLat, actualLng, guessLat, guessLng, timeSpent, timeLimit, options = {}) {
  const distance = calculateDistance(actualLat, actualLng, guessLat, guessLng);
  let score = calculateScore(distance);

  // Бонус за скорость
  if (options.speedBonus !== false) {
    const bonus = calculateSpeedBonus(timeSpent, timeLimit);
    if (options.isBlitz) {
      score += bonus * 2; // Двойной бонус в блиц-режиме
    } else {
      score += bonus;
    }
  }

  return {
    distance: Math.round(distance * 100) / 100,
    score,
    speedBonus: calculateSpeedBonus(timeSpent, timeLimit),
    isPerfect: distance < 0.05,
    isClose: distance < 50,
    isGood: distance < 500,
    isFar: distance > 5000,
  };
}

/**
 * Оценка результата (текстовая)
 */
export function getRating(distance) {
  if (distance < 0) return { text: 'Нет ответа', emoji: '😴', color: '#888' };
  if (distance < 0.05) return { text: 'Идеально!', emoji: '🎯', color: '#10b981' };
  if (distance < 1) return { text: 'Великолепно!', emoji: '🌟', color: '#10b981' };
  if (distance < 10) return { text: 'Отлично!', emoji: '⭐', color: '#34d399' };
  if (distance < 50) return { text: 'Очень хорошо!', emoji: '👏', color: '#6ee7b7' };
  if (distance < 150) return { text: 'Хорошо', emoji: '👍', color: '#fbbf24' };
  if (distance < 500) return { text: 'Неплохо', emoji: '🙂', color: '#f59e0b' };
  if (distance < 1500) return { text: 'Так себе', emoji: '😐', color: '#f97316' };
  if (distance < 5000) return { text: 'Далековато', emoji: '😬', color: '#ef4444' };
  return { text: 'Совсем мимо', emoji: '💀', color: '#dc2626' };
}

/**
 * Шкала оценки в процентах (0–100)
 */
export function getScorePercentage(score) {
  return Math.round((score / MAX_SCORE) * 100);
}

/**
 * Позиция на рейтинговой шкале
 */
export function getRank(totalScore, gamesPlayed) {
  if (gamesPlayed === 0) return { name: 'Новичок', emoji: '🌱', minScore: 0 };

  const avgScore = totalScore / gamesPlayed;

  const ranks = [
    { name: 'Новичок', emoji: '🌱', minScore: 0 },
    { name: 'Путешественник', emoji: '🧳', minScore: 5000 },
    { name: 'Исследователь', emoji: '🔭', minScore: 15000 },
    { name: 'Навигатор', emoji: '🧭', minScore: 30000 },
    { name: 'Картограф', emoji: '🗺️', minScore: 50000 },
    { name: 'Географ', emoji: '🌍', minScore: 80000 },
    { name: 'Мастер', emoji: '💎', minScore: 120000 },
    { name: 'Легенда', emoji: '👑', minScore: 200000 },
  ];

  let currentRank = ranks[0];
  for (const rank of ranks) {
    if (totalScore >= rank.minScore) {
      currentRank = rank;
    }
  }

  return currentRank;
}

export { MAX_SCORE, ZERO_SCORE_DISTANCE };
