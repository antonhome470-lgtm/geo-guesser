module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'geo-guesser-secret-key-2024',
  JWT_EXPIRE: '30d',
  MAX_PLAYERS_PER_ROOM: 20,
  DEFAULT_ROUNDS: 5,
  DEFAULT_TIME_LIMIT: 120,
  SCORING: {
    MAX_SCORE: 5000,
    // Расстояние в км, при котором начисляется 0 очков
    ZERO_SCORE_DISTANCE: 15000,
  },
  GAME_MODES: {
    CLASSIC: 'classic',
    SOLO: 'solo',
    DUEL: 'duel',
    BATTLE_ROYALE: 'battle_royale',
    TEAM: 'team',
    BLITZ: 'blitz',
  },
  MAP_PROVIDERS: {
    GOOGLE: 'google',
    YANDEX: 'yandex',
  },
};
