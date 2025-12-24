import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type OnlinePhase = 'lobby' | 'waiting' | 'reveal' | 'playing';

export interface OnlineGameState {
  phase: OnlinePhase;
  roomId: string | null;
  roomCode: string | null;
  playerId: string;
  playerSecret: string | null; // Secret for authenticating with Edge Function
  playerName: string;
  isHost: boolean;
  players: Player[];
  words: string[];
  impostorCount: number;
  currentWord: string | null;
  myRole: 'player' | 'impostor' | null;
}

// Edge function URL
const EDGE_FUNCTION_URL = 'https://tychxbzcoqjhyrkgphxw.supabase.co/functions/v1/game-actions';

export interface Player {
  id: string;
  player_id: string;
  player_name: string;
  is_host: boolean;
}

// Helper for Edge Function calls with player secret authentication
const callGameAction = async (
  playerId: string, 
  playerSecret: string | null, 
  action: string, 
  data: Record<string, unknown>
) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-player-id': playerId,
  };
  
  if (playerSecret) {
    headers['x-player-secret'] = playerSecret;
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...data }),
  });
  
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Unknown error');
  }
  return result;
};

const generatePlayerId = () => {
  const stored = localStorage.getItem('impostor_player_id');
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem('impostor_player_id', id);
  return id;
};

const getStoredPlayerSecret = (roomId: string): string | null => {
  return localStorage.getItem(`impostor_secret_${roomId}`);
};

const storePlayerSecret = (roomId: string, secret: string) => {
  localStorage.setItem(`impostor_secret_${roomId}`, secret);
};

const clearPlayerSecret = (roomId: string) => {
  localStorage.removeItem(`impostor_secret_${roomId}`);
};

const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export function useOnlineGame() {
  const [state, setState] = useState<OnlineGameState>({
    phase: 'lobby',
    roomId: null,
    roomCode: null,
    playerId: generatePlayerId(),
    playerSecret: null,
    playerName: '',
    isHost: false,
    players: [],
    words: [],
    impostorCount: 1,
    currentWord: null,
    myRole: null,
  });

  // Subscribe to room changes
  useEffect(() => {
    if (!state.roomId) return;

    const roomChannel = supabase
      .channel(`room-${state.roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${state.roomId}`,
        },
        async (payload) => {
          console.log('Room change:', payload);
          if (payload.eventType === 'UPDATE') {
            const room = payload.new as any;
            
            // When game starts, fetch role securely
            if (room.status === 'playing' && state.playerSecret) {
              try {
                const result = await callGameAction(state.playerId, state.playerSecret, 'get_my_word', {
                  roomId: state.roomId,
                });
                setState(prev => ({
                  ...prev,
                  words: room.words || [],
                  impostorCount: room.impostor_count || 1,
                  phase: 'reveal',
                  myRole: result.role as 'player' | 'impostor',
                  currentWord: result.word || null,
                }));
              } catch (error) {
                console.error('Error fetching role:', error);
              }
            } else {
              setState(prev => ({
                ...prev,
                words: room.words || [],
                impostorCount: room.impostor_count || 1,
              }));
            }
          } else if (payload.eventType === 'DELETE') {
            // Room was deleted
            if (state.roomId) {
              clearPlayerSecret(state.roomId);
            }
            setState(prev => ({ ...prev, phase: 'lobby', roomId: null, roomCode: null, playerSecret: null }));
          }
        }
      )
      .subscribe();

    // Fetch players securely via Edge Function (no sensitive data exposed)
    const fetchPlayers = async () => {
      try {
        const result = await callGameAction(state.playerId, null, 'get_players', {
          roomId: state.roomId,
        });
        
        if (result.players) {
          const myPlayer = result.players.find((p: Player) => p.player_id === state.playerId);
          setState(prev => ({
            ...prev,
            players: result.players,
            isHost: myPlayer?.is_host || false,
          }));
        }
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    };

    const playersChannel = supabase
      .channel(`players-${state.roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${state.roomId}`,
        },
        () => {
          // Refetch players via secure endpoint when any change happens
          fetchPlayers();
        }
      )
      .subscribe();

    // Initial fetch
    fetchPlayers();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [state.roomId, state.playerId, state.playerSecret]);

  const setPlayerName = useCallback((name: string) => {
    setState(prev => ({ ...prev, playerName: name }));
  }, []);

  const createRoom = useCallback(async () => {
    if (!state.playerName.trim()) return { error: 'Nombre requerido' };

    const roomCode = generateRoomCode();
    
    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .insert({
        room_code: roomCode,
        host_id: state.playerId,
        words: [],
        impostor_count: 1,
        status: 'waiting',
      })
      .select()
      .single();

    if (roomError) {
      console.error('Error creating room:', roomError);
      return { error: 'Error al crear la sala' };
    }

    // Register player via Edge Function to get secret
    try {
      const result = await callGameAction(state.playerId, null, 'register_player', {
        roomId: room.id,
        playerName: state.playerName.trim(),
        isHost: true,
      });

      if (result.playerSecret) {
        storePlayerSecret(room.id, result.playerSecret);
        
        setState(prev => ({
          ...prev,
          roomId: room.id,
          roomCode: roomCode,
          playerSecret: result.playerSecret,
          isHost: true,
          phase: 'waiting',
          players: [{
            id: '',
            player_id: state.playerId,
            player_name: state.playerName.trim(),
            is_host: true,
          }],
        }));

        return { success: true, roomCode };
      } else {
        throw new Error('No secret returned');
      }
    } catch (error) {
      console.error('Error registering player:', error);
      // Clean up the room if registration failed
      await supabase.from('game_rooms').delete().eq('id', room.id);
      return { error: 'Error al registrar jugador' };
    }
  }, [state.playerName, state.playerId]);

  const joinRoom = useCallback(async (code: string) => {
    if (!state.playerName.trim()) return { error: 'Nombre requerido' };
    if (!code.trim()) return { error: 'Código requerido' };

    const { data: room, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('room_code', code.toUpperCase())
      .single();

    if (roomError || !room) {
      return { error: 'Sala no encontrada' };
    }

    if (room.status !== 'waiting') {
      return { error: 'La partida ya comenzó' };
    }

    // Check if we have a stored secret for this room
    const storedSecret = getStoredPlayerSecret(room.id);
    
    // Try to register (will return existing secret if already registered)
    try {
      const result = await callGameAction(state.playerId, null, 'register_player', {
        roomId: room.id,
        playerName: state.playerName.trim(),
        isHost: false,
      });

      if (result.playerSecret) {
        storePlayerSecret(room.id, result.playerSecret);
        
        setState(prev => ({
          ...prev,
          roomId: room.id,
          roomCode: room.room_code,
          playerSecret: result.playerSecret,
          isHost: false,
          phase: 'waiting',
        }));

        return { success: true };
      } else if (storedSecret) {
        // Use stored secret if registration didn't return one
        setState(prev => ({
          ...prev,
          roomId: room.id,
          roomCode: room.room_code,
          playerSecret: storedSecret,
          isHost: false,
          phase: 'waiting',
        }));
        return { success: true };
      } else {
        throw new Error('No secret available');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      return { error: 'Error al unirse a la sala' };
    }
  }, [state.playerName, state.playerId]);

  const addWord = useCallback(async (word: string) => {
    if (!state.roomId || !state.isHost || !state.playerSecret) return;
    const trimmed = word.trim();
    if (!trimmed || state.words.includes(trimmed)) return;

    const newWords = [...state.words, trimmed];
    try {
      await callGameAction(state.playerId, state.playerSecret, 'update_room', {
        roomId: state.roomId,
        words: newWords,
      });
    } catch (error) {
      console.error('Error adding word:', error);
    }
  }, [state.roomId, state.isHost, state.words, state.playerId, state.playerSecret]);

  const removeWord = useCallback(async (word: string) => {
    if (!state.roomId || !state.isHost || !state.playerSecret) return;

    const newWords = state.words.filter(w => w !== word);
    try {
      await callGameAction(state.playerId, state.playerSecret, 'update_room', {
        roomId: state.roomId,
        words: newWords,
      });
    } catch (error) {
      console.error('Error removing word:', error);
    }
  }, [state.roomId, state.isHost, state.words, state.playerId, state.playerSecret]);

  const setImpostorCount = useCallback(async (count: number) => {
    if (!state.roomId || !state.isHost || !state.playerSecret) return;

    try {
      await callGameAction(state.playerId, state.playerSecret, 'update_room', {
        roomId: state.roomId,
        impostorCount: count,
      });
    } catch (error) {
      console.error('Error setting impostor count:', error);
    }
  }, [state.roomId, state.isHost, state.playerId, state.playerSecret]);

  const startGame = useCallback(async () => {
    if (!state.roomId || !state.isHost || !state.playerSecret) return { error: 'No eres el host' };
    if (state.words.length === 0) return { error: 'Agrega al menos una palabra' };
    if (state.players.length < 3) return { error: 'Se necesitan al menos 3 jugadores' };

    try {
      await callGameAction(state.playerId, state.playerSecret, 'start_game', {
        roomId: state.roomId,
        words: state.words,
        impostorCount: state.impostorCount,
      });
      return { success: true };
    } catch (error) {
      console.error('Error starting game:', error);
      return { error: error instanceof Error ? error.message : 'Error al iniciar' };
    }
  }, [state.roomId, state.isHost, state.words, state.players, state.impostorCount, state.playerId, state.playerSecret]);

  const confirmRole = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'playing' }));
  }, []);

  const newRound = useCallback(async () => {
    if (!state.roomId || !state.isHost || !state.playerSecret) return;

    try {
      await callGameAction(state.playerId, state.playerSecret, 'new_round', {
        roomId: state.roomId,
      });
      setState(prev => ({ ...prev, phase: 'waiting', myRole: null, currentWord: null }));
    } catch (error) {
      console.error('Error starting new round:', error);
    }
  }, [state.roomId, state.isHost, state.playerId, state.playerSecret]);

  const leaveRoom = useCallback(async () => {
    if (!state.roomId) return;

    // If host leaves, use edge function to delete room properly
    if (state.isHost && state.playerSecret) {
      try {
        await callGameAction(state.playerId, state.playerSecret, 'delete_room', {
          roomId: state.roomId,
        });
      } catch (error) {
        console.error('Error deleting room:', error);
      }
    } else {
      // Non-host can leave directly
      await supabase
        .from('room_players')
        .delete()
        .eq('room_id', state.roomId)
        .eq('player_id', state.playerId);
    }

    // Clear stored secret
    clearPlayerSecret(state.roomId);

    setState(prev => ({
      ...prev,
      phase: 'lobby',
      roomId: null,
      roomCode: null,
      playerSecret: null,
      isHost: false,
      players: [],
      myRole: null,
      currentWord: null,
    }));
  }, [state.roomId, state.playerId, state.isHost, state.playerSecret]);

  const canStartGame = state.words.length > 0 && 
    state.players.length >= 3 && 
    state.impostorCount >= 1 && 
    state.impostorCount < state.players.length;

  return {
    state,
    setPlayerName,
    createRoom,
    joinRoom,
    addWord,
    removeWord,
    setImpostorCount,
    startGame,
    confirmRole,
    newRound,
    leaveRoom,
    canStartGame,
  };
}
