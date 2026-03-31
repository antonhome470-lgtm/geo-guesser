import React, { createContext, useContext, useReducer, useCallback } from 'react';

const GameContext = createContext(null);

// Типы действий
const ACTIONS = {
  SET_GAME_STATE: 'SET_GAME_STATE',
  SET_GAME_ID: 'SET_GAME_ID',
  SET_ROOM: 'SET_ROOM',
  SET_ROUND: 'SET_ROUND',
  SET_PANORAMA: 'SET_PANORAMA',
  SET_GUESS: 'SET_GUESS',
  SET_HAS_GUESSED: 'SET_HAS_GUESSED',
  SET_ROUND_RESULTS: 'SET_ROUND_RESULTS',
  SET_FINAL_RESULTS: 'SET_FINAL_RESULTS',
  SET_SCORES: 'SET_SCORES',
  SET_SETTINGS: 'SET_SETTINGS',
  UPDATE_GUESSED_COUNT: 'UPDATE_GUESSED_COUNT',
  RESET_ROUND: 'RESET_ROUND',
  RESET_GAME: 'RESET_GAME',
};

// Начальное состояние
const initialState = {
  // Комната
  room: null,
  isHost: false,

  // Игра
  gameState: 'idle', // idle, waiting, playing, round_results, finished
  gameId: null,
  settings: null,

  // Раунд
  currentRound: 0,
  totalRounds: 0,
  panoramaLocation: null,
  guessLocation: null,
  hasGuessed: false,
  roundStartTime: null,

  // Результаты
  roundResults: null,
  finalResults: null,
  scores: [],

  // Счётчики
  guessedPlayers: 0,
  totalPlayers: 0,
};

// Reducer
function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_GAME_STATE:
      return { ...state, gameState: action.payload };

    case ACTIONS.SET_GAME_ID:
      return { ...state, gameId: action.payload };

    case ACTIONS.SET_ROOM:
      return {
        ...state,
        room: action.payload.room,
        isHost: action.payload.isHost,
      };

    case ACTIONS.SET_ROUND:
      return {
        ...state,
        currentRound: action.payload.roundNumber,
        totalRounds: action.payload.totalRounds || state.totalRounds,
        panoramaLocation: action.payload.location,
        roundStartTime: Date.now(),
        guessLocation: null,
        hasGuessed: false,
        roundResults: null,
        guessedPlayers: 0,
        totalPlayers: action.payload.totalPlayers || state.totalPlayers,
      };

    case ACTIONS.SET_PANORAMA:
      return { ...state, panoramaLocation: action.payload };

    case ACTIONS.SET_GUESS:
      return { ...state, guessLocation: action.payload };

    case ACTIONS.SET_HAS_GUESSED:
      return { ...state, hasGuessed: action.payload };

    case ACTIONS.SET_ROUND_RESULTS:
      return {
        ...state,
        gameState: 'round_results',
        roundResults: action.payload,
      };

    case ACTIONS.SET_FINAL_RESULTS:
      return {
        ...state,
        gameState: 'finished',
        finalResults: action.payload,
      };

    case ACTIONS.SET_SCORES:
      return { ...state, scores: action.payload };

    case ACTIONS.SET_SETTINGS:
      return { ...state, settings: action.payload };

    case ACTIONS.UPDATE_GUESSED_COUNT:
      return {
        ...state,
        guessedPlayers: action.payload.guessedPlayers,
        totalPlayers: action.payload.totalPlayers || state.totalPlayers,
      };

    case ACTIONS.RESET_ROUND:
      return {
        ...state,
        guessLocation: null,
        hasGuessed: false,
        roundResults: null,
        guessedPlayers: 0,
        roundStartTime: null,
      };

    case ACTIONS.RESET_GAME:
      return { ...initialState };

    default:
      return state;
  }
}

// Provider
export const GameProvider = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  // --- Action Creators ---

  const setGameState = useCallback((gameState) => {
    dispatch({ type: ACTIONS.SET_GAME_STATE, payload: gameState });
  }, []);

  const setGameId = useCallback((id) => {
    dispatch({ type: ACTIONS.SET_GAME_ID, payload: id });
  }, []);

  const setRoom = useCallback((room, isHost) => {
    dispatch({ type: ACTIONS.SET_ROOM, payload: { room, isHost } });
  }, []);

  const setRound = useCallback((roundData) => {
    dispatch({ type: ACTIONS.SET_ROUND, payload: roundData });
  }, []);

  const setPanorama = useCallback((location) => {
    dispatch({ type: ACTIONS.SET_PANORAMA, payload: location });
  }, []);

  const setGuess = useCallback((location) => {
    dispatch({ type: ACTIONS.SET_GUESS, payload: location });
  }, []);

  const setHasGuessed = useCallback((value) => {
    dispatch({ type: ACTIONS.SET_HAS_GUESSED, payload: value });
  }, []);

  const setRoundResults = useCallback((results) => {
    dispatch({ type: ACTIONS.SET_ROUND_RESULTS, payload: results });
  }, []);

  const setFinalResults = useCallback((results) => {
    dispatch({ type: ACTIONS.SET_FINAL_RESULTS, payload: results });
  }, []);

  const setScores = useCallback((scores) => {
    dispatch({ type: ACTIONS.SET_SCORES, payload: scores });
  }, []);

  const setSettings = useCallback((settings) => {
    dispatch({ type: ACTIONS.SET_SETTINGS, payload: settings });
  }, []);

  const updateGuessedCount = useCallback((guessedPlayers, totalPlayers) => {
    dispatch({
      type: ACTIONS.UPDATE_GUESSED_COUNT,
      payload: { guessedPlayers, totalPlayers },
    });
  }, []);

  const resetRound = useCallback(() => {
    dispatch({ type: ACTIONS.RESET_ROUND });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: ACTIONS.RESET_GAME });
  }, []);

  // Вычисляемые значения
  const getTimeSpent = useCallback(() => {
    if (!state.roundStartTime) return 0;
    return Math.round((Date.now() - state.roundStartTime) / 1000);
  }, [state.roundStartTime]);

  const isAllGuessed = state.guessedPlayers >= state.totalPlayers && state.totalPlayers > 0;

  const value = {
    ...state,
    isAllGuessed,

    // Actions
    setGameState,
    setGameId,
    setRoom,
    setRound,
    setPanorama,
    setGuess,
    setHasGuessed,
    setRoundResults,
    setFinalResults,
    setScores,
    setSettings,
    updateGuessedCount,
    resetRound,
    resetGame,
    getTimeSpent,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGameContext must be used within GameProvider');
  return context;
};

export default GameContext;
