import { useState, useCallback } from 'react';

export type GamePhase = 'home' | 'setup' | 'reveal' | 'playing';
export type GameMode = 'offline' | 'online' | null;

export interface GameState {
  mode: GameMode;
  words: string[];
  playerCount: number;
  impostorCount: number;
  currentWord: string;
  roles: ('player' | 'impostor')[];
  currentPlayerIndex: number;
  phase: GamePhase;
}

const initialState: GameState = {
  mode: null,
  words: [],
  playerCount: 4,
  impostorCount: 1,
  currentWord: '',
  roles: [],
  currentPlayerIndex: 0,
  phase: 'home',
};

export function useImpostorGame() {
  const [state, setState] = useState<GameState>(initialState);

  const addWord = useCallback((word: string) => {
    const trimmed = word.trim();
    if (trimmed && !state.words.includes(trimmed)) {
      setState(prev => ({ ...prev, words: [...prev.words, trimmed] }));
    }
  }, [state.words]);

  const removeWord = useCallback((word: string) => {
    setState(prev => ({ ...prev, words: prev.words.filter(w => w !== word) }));
  }, []);

  const setPlayerCount = useCallback((count: number) => {
    setState(prev => {
      const maxImpostors = Math.floor(count / 2);
      return {
        ...prev,
        playerCount: count,
        impostorCount: Math.min(prev.impostorCount, maxImpostors),
      };
    });
  }, []);

  const setImpostorCount = useCallback((count: number) => {
    setState(prev => ({ ...prev, impostorCount: count }));
  }, []);

  const startGame = useCallback(() => {
    if (state.words.length === 0 || state.playerCount < 2) return;

    // Select random word
    const randomWord = state.words[Math.floor(Math.random() * state.words.length)];

    // Generate roles
    const roles: ('player' | 'impostor')[] = Array(state.playerCount).fill('player');
    const impostorIndices = new Set<number>();
    
    while (impostorIndices.size < state.impostorCount) {
      impostorIndices.add(Math.floor(Math.random() * state.playerCount));
    }
    
    impostorIndices.forEach(i => {
      roles[i] = 'impostor';
    });

    // Shuffle roles
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    setState(prev => ({
      ...prev,
      currentWord: randomWord,
      roles,
      currentPlayerIndex: 0,
      phase: 'reveal',
    }));
  }, [state.words, state.playerCount, state.impostorCount]);

  const nextPlayer = useCallback(() => {
    setState(prev => {
      const nextIndex = prev.currentPlayerIndex + 1;
      if (nextIndex >= prev.playerCount) {
        return { ...prev, phase: 'playing' };
      }
      return { ...prev, currentPlayerIndex: nextIndex };
    });
  }, []);

  const newRound = useCallback(() => {
    startGame();
  }, [startGame]);

  const resetGame = useCallback(() => {
    setState(prev => ({ ...initialState, mode: prev.mode, words: prev.words }));
  }, []);

  const selectMode = useCallback((mode: GameMode) => {
    if (mode === null) {
      setState(initialState);
    } else {
      setState(prev => ({ ...prev, mode, phase: 'setup' }));
    }
  }, []);

  const goHome = useCallback(() => {
    setState(initialState);
  }, []);

  const canStartGame = state.words.length > 0 && 
    state.playerCount >= 2 && 
    state.impostorCount >= 1 && 
    state.impostorCount < state.playerCount;

  return {
    state,
    addWord,
    removeWord,
    setPlayerCount,
    setImpostorCount,
    startGame,
    nextPlayer,
    newRound,
    resetGame,
    selectMode,
    goHome,
    canStartGame,
  };
}
