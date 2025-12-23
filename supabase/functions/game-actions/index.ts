import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-player-id',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const playerId = req.headers.get('x-player-id');
    if (!playerId) {
      return new Response(
        JSON.stringify({ error: 'Player ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, roomId, ...params } = await req.json();
    console.log(`Action: ${action}, Room: ${roomId}, Player: ${playerId}`);

    // Validate host for sensitive operations
    const validateHost = async (roomId: string, playerId: string) => {
      const { data: room, error } = await supabase
        .from('game_rooms')
        .select('host_id')
        .eq('id', roomId)
        .single();

      if (error || !room) {
        throw new Error('Room not found');
      }

      if (room.host_id !== playerId) {
        throw new Error('Only the host can perform this action');
      }

      return room;
    };

    switch (action) {
      case 'start_game': {
        await validateHost(roomId, playerId);

        const { words, impostorCount } = params;
        
        if (!words || words.length === 0) {
          throw new Error('At least one word is required');
        }

        // Get all players in the room
        const { data: players, error: playersError } = await supabase
          .from('room_players')
          .select('*')
          .eq('room_id', roomId);

        if (playersError || !players || players.length < 2) {
          throw new Error('At least 2 players are required');
        }

        // Select random word
        const randomWord = words[Math.floor(Math.random() * words.length)];
        console.log(`Selected word: ${randomWord}`);

        // Assign roles
        const playerCount = players.length;
        const actualImpostorCount = Math.min(impostorCount, Math.floor(playerCount / 2));
        const roles: ('player' | 'impostor')[] = Array(playerCount).fill('player');
        const impostorIndices = new Set<number>();
        
        while (impostorIndices.size < actualImpostorCount) {
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

        // Update each player with role and assigned_word (only for 'player' role)
        for (let i = 0; i < players.length; i++) {
          const role = roles[i];
          const assignedWord = role === 'player' ? randomWord : null;
          
          await supabase
            .from('room_players')
            .update({ 
              role: role,
              assigned_word: assignedWord 
            })
            .eq('id', players[i].id);
        }

        // Update room status (don't expose current_word to clients anymore)
        await supabase
          .from('game_rooms')
          .update({ 
            current_word: randomWord, // Keep for reference but clients won't see
            status: 'playing',
          })
          .eq('id', roomId);

        console.log('Game started successfully');
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'new_round': {
        await validateHost(roomId, playerId);

        // Reset all players' roles and assigned_word
        await supabase
          .from('room_players')
          .update({ role: null, assigned_word: null })
          .eq('room_id', roomId);

        // Reset room
        await supabase
          .from('game_rooms')
          .update({ 
            current_word: null,
            status: 'waiting',
          })
          .eq('id', roomId);

        console.log('New round started');
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_room': {
        await validateHost(roomId, playerId);
        
        const { words, impostorCount } = params;
        const updateData: Record<string, any> = {};
        
        if (words !== undefined) updateData.words = words;
        if (impostorCount !== undefined) updateData.impostor_count = impostorCount;

        await supabase
          .from('game_rooms')
          .update(updateData)
          .eq('id', roomId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_room': {
        await validateHost(roomId, playerId);

        // Delete all players first
        await supabase
          .from('room_players')
          .delete()
          .eq('room_id', roomId);

        // Delete room
        await supabase
          .from('game_rooms')
          .delete()
          .eq('id', roomId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_my_word': {
        // Get player's assigned word (only returns if they have role 'player')
        const { data: player, error } = await supabase
          .from('room_players')
          .select('role, assigned_word')
          .eq('room_id', roomId)
          .eq('player_id', playerId)
          .single();

        if (error || !player) {
          throw new Error('Player not found in room');
        }

        return new Response(
          JSON.stringify({ 
            role: player.role,
            word: player.assigned_word // null for impostors
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in game-actions:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
