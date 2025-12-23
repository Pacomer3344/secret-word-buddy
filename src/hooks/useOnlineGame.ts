import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type OnlinePhase = 'lobby' | 'waiting' | 'reveal' | 'playing';

export interface OnlineGameState {
  phase: OnlinePhase;
  roomId: string | null;
  roomCode: string | null;
  playerId: string;
  playerName: string;
  isHost: boolean;
  players: Player[];
  words: string[];
  impostorCount: number;
  currentWord: string | null; // Only set from assigned_word for 'player' role
  myRole: 'player' | 'impostor' | null;
}

// Edge function URL
const EDGE_FUNCTION_URL = 'https://tychxbzcoqjhyrkgphxw.supabase.co/functions/v1/game-actions';

export interface Player {
  id: string;
  player_id: string;
  player_name: string;
  is_host: boolean;
  role: string | null;
  assigned_word: string | null;
}

// Helper for Edge Function calls
const callGameAction = async (playerId: string, action: string, data: Record<string, unknown>) => {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-player-id': playerId,
    },
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
            setState(prev => ({
              ...prev,
              words: room.words || [],
              impostorCount: room.impostor_count || 1,
              currentWord: room.current_word,
              phase: room.status === 'playing' ? 'reveal' : prev.phase,
            }));
          } else if (payload.eventType === 'DELETE') {
            // Room was deleted
            setState(prev => ({ ...prev, phase: 'lobby', roomId: null, roomCode: null }));
          }
        }
      )
      .subscribe();

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
        async () => {
          // Refetch all players when any change happens
          const { data } = await supabase
            .from('room_players')
            .select('*')
            .eq('room_id', state.roomId)
            .order('joined_at');
          
          if (data) {
            const myPlayer = data.find(p => p.player_id === state.playerId);
            setState(prev => ({
              ...prev,
              players: data,
              myRole: myPlayer?.role as 'player' | 'impostor' | null,
              // Get word from assigned_word (secure: only 'player' role has it)
              currentWord: myPlayer?.assigned_word || null,
              isHost: myPlayer?.is_host || false,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [state.roomId, state.playerId]);

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

    const { error: playerError } = await supabase
      .from('room_players')
      .insert({
        room_id: room.id,
        player_id: state.playerId,
        player_name: state.playerName.trim(),
        is_host: true,
      });

    if (playerError) {
      console.error('Error adding player:', playerError);
      return { error: 'Error al unirse a la sala' };
    }

    setState(prev => ({
      ...prev,
      roomId: room.id,
      roomCode: roomCode,
      isHost: true,
      phase: 'waiting',
      players: [{
        id: '',
        player_id: state.playerId,
        player_name: state.playerName.trim(),
        is_host: true,
        role: null,
        assigned_word: null,
      }],
    }));

    return { success: true, roomCode };
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

    // Check if player already in room
    const { data: existingPlayer } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', room.id)
      .eq('player_id', state.playerId)
      .single();

    if (existingPlayer) {
      // Already in room, just update state
      setState(prev => ({
        ...prev,
        roomId: room.id,
        roomCode: room.room_code,
        isHost: existingPlayer.is_host,
        phase: 'waiting',
      }));
      return { success: true };
    }

    const { error: playerError } = await supabase
      .from('room_players')
      .insert({
        room_id: room.id,
        player_id: state.playerId,
        player_name: state.playerName.trim(),
        is_host: false,
      });

    if (playerError) {
      console.error('Error joining room:', playerError);
      return { error: 'Error al unirse a la sala' };
    }

    setState(prev => ({
      ...prev,
      roomId: room.id,
      roomCode: room.room_code,
      isHost: false,
      phase: 'waiting',
    }));

    return { success: true };
  }, [state.playerName, state.playerId]);

  const addWord = useCallback(async (word: string) => {
    if (!state.roomId || !state.isHost) return;
    const trimmed = word.trim();
    if (!trimmed || state.words.includes(trimmed)) return;

    const newWords = [...state.words, trimmed];
    try {
      await callGameAction(state.playerId, 'update_room', {
        roomId: state.roomId,
        words: newWords,
      });
    } catch (error) {
      console.error('Error adding word:', error);
    }
  }, [state.roomId, state.isHost, state.words, state.playerId]);

  const removeWord = useCallback(async (word: string) => {
    if (!state.roomId || !state.isHost) return;

    const newWords = state.words.filter(w => w !== word);
    try {
      await callGameAction(state.playerId, 'update_room', {
        roomId: state.roomId,
        words: newWords,
      });
    } catch (error) {
      console.error('Error removing word:', error);
    }
  }, [state.roomId, state.isHost, state.words, state.playerId]);

  const setImpostorCount = useCallback(async (count: number) => {
    if (!state.roomId || !state.isHost) return;

    try {
      await callGameAction(state.playerId, 'update_room', {
        roomId: state.roomId,
        impostorCount: count,
      });
    } catch (error) {
      console.error('Error setting impostor count:', error);
    }
  }, [state.roomId, state.isHost, state.playerId]);

  const startGame = useCallback(async () => {
    if (!state.roomId || !state.isHost) return { error: 'No eres el host' };
    if (state.words.length === 0) return { error: 'Agrega al menos una palabra' };
    if (state.players.length < 2) return { error: 'Se necesitan al menos 2 jugadores' };

    try {
      await callGameAction(state.playerId, 'start_game', {
        roomId: state.roomId,
        words: state.words,
        impostorCount: state.impostorCount,
      });
      return { success: true };
    } catch (error) {
      console.error('Error starting game:', error);
      return { error: error instanceof Error ? error.message : 'Error al iniciar' };
    }
  }, [state.roomId, state.isHost, state.words, state.players, state.impostorCount, state.playerId]);

  const confirmRole = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'playing' }));
  }, []);

  const newRound = useCallback(async () => {
    if (!state.roomId || !state.isHost) return;

    try {
      await callGameAction(state.playerId, 'new_round', {
        roomId: state.roomId,
      });
      setState(prev => ({ ...prev, phase: 'waiting', myRole: null, currentWord: null }));
    } catch (error) {
      console.error('Error starting new round:', error);
    }
  }, [state.roomId, state.isHost, state.playerId]);

  const leaveRoom = useCallback(async () => {
    if (!state.roomId) return;

    // If host leaves, use edge function to delete room properly
    if (state.isHost) {
      try {
        await callGameAction(state.playerId, 'delete_room', {
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

    setState(prev => ({
      ...prev,
      phase: 'lobby',
      roomId: null,
      roomCode: null,
      isHost: false,
      players: [],
      myRole: null,
      currentWord: null,
    }));
  }, [state.roomId, state.playerId, state.isHost]);

  const canStartGame = state.words.length > 0 && 
    state.players.length >= 2 && 
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
