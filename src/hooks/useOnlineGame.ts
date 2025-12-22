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
  currentWord: string | null;
  myRole: 'player' | 'impostor' | null;
}

export interface Player {
  id: string;
  player_id: string;
  player_name: string;
  is_host: boolean;
  role: string | null;
}

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

    await supabase
      .from('game_rooms')
      .update({ words: [...state.words, trimmed] })
      .eq('id', state.roomId);
  }, [state.roomId, state.isHost, state.words]);

  const removeWord = useCallback(async (word: string) => {
    if (!state.roomId || !state.isHost) return;

    await supabase
      .from('game_rooms')
      .update({ words: state.words.filter(w => w !== word) })
      .eq('id', state.roomId);
  }, [state.roomId, state.isHost, state.words]);

  const setImpostorCount = useCallback(async (count: number) => {
    if (!state.roomId || !state.isHost) return;

    await supabase
      .from('game_rooms')
      .update({ impostor_count: count })
      .eq('id', state.roomId);
  }, [state.roomId, state.isHost]);

  const startGame = useCallback(async () => {
    if (!state.roomId || !state.isHost) return { error: 'No eres el host' };
    if (state.words.length === 0) return { error: 'Agrega al menos una palabra' };
    if (state.players.length < 2) return { error: 'Se necesitan al menos 2 jugadores' };

    // Select random word
    const randomWord = state.words[Math.floor(Math.random() * state.words.length)];

    // Assign roles
    const playerCount = state.players.length;
    const impostorCount = Math.min(state.impostorCount, Math.floor(playerCount / 2));
    const roles: ('player' | 'impostor')[] = Array(playerCount).fill('player');
    const impostorIndices = new Set<number>();
    
    while (impostorIndices.size < impostorCount) {
      impostorIndices.add(Math.floor(Math.random() * playerCount));
    }
    
    impostorIndices.forEach(i => {
      roles[i] = 'impostor';
    });

    // Shuffle roles
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    // Update each player's role
    for (let i = 0; i < state.players.length; i++) {
      await supabase
        .from('room_players')
        .update({ role: roles[i] })
        .eq('id', state.players[i].id);
    }

    // Update room status
    await supabase
      .from('game_rooms')
      .update({ 
        current_word: randomWord,
        status: 'playing',
      })
      .eq('id', state.roomId);

    return { success: true };
  }, [state.roomId, state.isHost, state.words, state.players, state.impostorCount]);

  const confirmRole = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'playing' }));
  }, []);

  const newRound = useCallback(async () => {
    if (!state.roomId || !state.isHost) return;

    // Reset roles
    for (const player of state.players) {
      await supabase
        .from('room_players')
        .update({ role: null })
        .eq('id', player.id);
    }

    // Reset room
    await supabase
      .from('game_rooms')
      .update({ 
        current_word: null,
        status: 'waiting',
      })
      .eq('id', state.roomId);

    setState(prev => ({ ...prev, phase: 'waiting', myRole: null }));
  }, [state.roomId, state.isHost, state.players]);

  const leaveRoom = useCallback(async () => {
    if (!state.roomId) return;

    await supabase
      .from('room_players')
      .delete()
      .eq('room_id', state.roomId)
      .eq('player_id', state.playerId);

    // If host leaves, delete the room
    if (state.isHost) {
      await supabase
        .from('game_rooms')
        .delete()
        .eq('id', state.roomId);
    }

    setState(prev => ({
      ...prev,
      phase: 'lobby',
      roomId: null,
      roomCode: null,
      isHost: false,
      players: [],
      myRole: null,
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
