import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Allowed origins for CORS - restrict to deployment domains
const ALLOWED_ORIGINS = [
  'https://tychxbzcoqjhyrkgphxw.lovableproject.com',
  'https://lovable.dev',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5173',
];

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app') || origin.endsWith('.lovableproject.com')
  ) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-player-id, x-player-secret',
    'Access-Control-Allow-Credentials': 'true',
  };
};

// Input validation schemas
const uuidSchema = z.string().uuid({ message: "Invalid UUID format" });
const playerNameSchema = z.string().trim().min(1, "Name required").max(50, "Name too long (max 50 chars)");
const wordSchema = z.string().trim().min(1, "Word cannot be empty").max(100, "Word too long (max 100 chars)");
const wordsArraySchema = z.array(wordSchema).min(1, "At least one word required").max(50, "Too many words (max 50)");
const impostorCountSchema = z.number().int().min(1, "At least 1 impostor").max(10, "Max 10 impostors");

const registerPlayerSchema = z.object({
  roomId: uuidSchema,
  playerName: playerNameSchema,
  isHost: z.boolean().optional().default(false),
});

const startGameSchema = z.object({
  roomId: uuidSchema,
  words: wordsArraySchema,
  impostorCount: impostorCountSchema,
});

const updateRoomSchema = z.object({
  roomId: uuidSchema,
  words: wordsArraySchema.optional(),
  impostorCount: impostorCountSchema.optional(),
});

const roomActionSchema = z.object({
  roomId: uuidSchema,
});

// Allowlist-based sanitization - only permit safe characters
// For player names: alphanumeric, spaces, common accents, hyphens
// For words: alphanumeric, spaces, common punctuation, accents
const sanitizePlayerName = (str: string): string => {
  // Normalize unicode, strip control chars, keep only safe characters
  return str
    .normalize('NFKC') // Normalize unicode to prevent bypasses
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/[^\p{L}\p{N}\s\-_.]/gu, '') // Keep letters, numbers, spaces, hyphens, underscores, dots
    .trim()
    .slice(0, 50); // Enforce max length
};

const sanitizeWord = (str: string): string => {
  // Normalize unicode, strip control chars, keep alphanumeric + common punctuation
  return str
    .normalize('NFKC') // Normalize unicode to prevent bypasses
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/[^\p{L}\p{N}\s\-_.,!?'"()]/gu, '') // Keep letters, numbers, spaces, common punctuation
    .trim()
    .slice(0, 100); // Enforce max length
};

// Simple in-memory rate limiter (per Deno isolate)
// Note: In production with multiple isolates, use Redis or database-backed rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  register_player: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  start_game: { maxRequests: 5, windowMs: 60000 }, // 5 per minute
  update_room: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
  delete_room: { maxRequests: 5, windowMs: 60000 }, // 5 per minute
  leave_room: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  new_round: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
  get_my_word: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
  get_players: { maxRequests: 60, windowMs: 60000 }, // 60 per minute
};

const checkRateLimit = (key: string, action: string): { allowed: boolean; retryAfter?: number } => {
  const config = RATE_LIMITS[action];
  if (!config) return { allowed: true };

  const now = Date.now();
  const rateLimitKey = `${action}:${key}`;
  const entry = rateLimitStore.get(rateLimitKey);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetAt) rateLimitStore.delete(k);
    }
  }

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore.set(rateLimitKey, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
};

// Verify player identity using the stored secret
const verifyPlayer = async (supabase: any, playerId: string, playerSecret: string, roomId: string) => {
  const { data: player, error } = await supabase
    .from('room_players')
    .select('id, player_id, player_secret, is_host')
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .single();

  if (error || !player) {
    return { valid: false, error: 'Player not found in room' };
  }

  // Verify the secret matches
  if (player.player_secret !== playerSecret) {
    console.log('Secret mismatch - potential impersonation attempt');
    return { valid: false, error: 'Invalid player credentials' };
  }

  return { valid: true, player };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const playerId = req.headers.get('x-player-id');
    const playerSecret = req.headers.get('x-player-secret');
    
    // Validate player ID format
    if (!playerId) {
      return new Response(
        JSON.stringify({ error: 'Player ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate playerId is a valid UUID
    const playerIdResult = uuidSchema.safeParse(playerId);
    if (!playerIdResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid player ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, roomId, ...params } = body;

    // Rate limiting check - use playerId as the rate limit key
    const rateLimitResult = checkRateLimit(playerId, action);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          } 
        }
      );
    }

    // Actions that require room membership and secret verification
    const securedActions = ['start_game', 'new_round', 'update_room', 'delete_room', 'get_my_word', 'leave_room'];
    
    if (securedActions.includes(action)) {
      if (!playerSecret) {
        return new Response(
          JSON.stringify({ error: 'Player secret required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate roomId for secured actions
      const roomIdResult = uuidSchema.safeParse(roomId);
      if (!roomIdResult.success) {
        return new Response(
          JSON.stringify({ error: 'Invalid room ID format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const verification = await verifyPlayer(supabase, playerId, playerSecret, roomId);
      if (!verification.valid) {
        return new Response(
          JSON.stringify({ error: verification.error }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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
      case 'register_player': {
        // Validate input - roomId comes from body directly, not params
        const parseResult = registerPlayerSchema.safeParse({
          roomId: roomId,
          playerName: params.playerName,
          isHost: params.isHost,
        });

        if (!parseResult.success) {
          const errorMessage = parseResult.error.errors.map(e => e.message).join(', ');
          return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { roomId: regRoomId, playerName, isHost } = parseResult.data;
        const sanitizedName = sanitizePlayerName(playerName);

        // Generate a secure random secret for this player
        const secret = crypto.randomUUID();

        // Check if player already exists in this room
        const { data: existingPlayer } = await supabase
          .from('room_players')
          .select('id, player_secret')
          .eq('room_id', regRoomId)
          .eq('player_id', playerId)
          .single();

        if (existingPlayer) {
          // Return existing secret if already registered
          return new Response(
            JSON.stringify({ success: true, playerSecret: existingPlayer.player_secret }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Insert new player with secret
        const { error: insertError } = await supabase
          .from('room_players')
          .insert({
            room_id: regRoomId,
            player_id: playerId,
            player_name: sanitizedName,
            is_host: isHost,
            player_secret: secret,
          });

        if (insertError) {
          console.error('Error registering player:', insertError);
          throw new Error('Failed to register player');
        }

        console.log(`Player registered: ${playerId} in room ${regRoomId}`);
        return new Response(
          JSON.stringify({ success: true, playerSecret: secret }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'start_game': {
        await validateHost(roomId, playerId);

        // Validate input
        const parseResult = startGameSchema.safeParse({
          roomId,
          words: params.words,
          impostorCount: params.impostorCount,
        });

        if (!parseResult.success) {
          const errorMessage = parseResult.error.errors.map(e => e.message).join(', ');
          return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { words, impostorCount } = parseResult.data;
        
        // Sanitize all words using allowlist approach
        const sanitizedWords = words.map(sanitizeWord);

        // Get all players in the room
        const { data: players, error: playersError } = await supabase
          .from('room_players')
          .select('*')
          .eq('room_id', roomId);

        if (playersError || !players || players.length < 3) {
          throw new Error('At least 3 players are required');
        }

        // Select random word
        const randomWord = sanitizedWords[Math.floor(Math.random() * sanitizedWords.length)];
        console.log(`Selected word for room ${roomId}`);

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

        // Update room status and store sanitized words
        await supabase
          .from('game_rooms')
          .update({ 
            current_word: randomWord,
            words: sanitizedWords,
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
        // Validate roomId
        const parseResult = roomActionSchema.safeParse({ roomId });
        if (!parseResult.success) {
          return new Response(
            JSON.stringify({ error: 'Invalid room ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

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
        
        // Validate input
        const parseResult = updateRoomSchema.safeParse({
          roomId,
          words: params.words,
          impostorCount: params.impostorCount,
        });

        if (!parseResult.success) {
          const errorMessage = parseResult.error.errors.map(e => e.message).join(', ');
          return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { words, impostorCount } = parseResult.data;
        const updateData: Record<string, any> = {};
        
        if (words !== undefined) {
          updateData.words = words.map(sanitizeWord);
        }
        if (impostorCount !== undefined) {
          updateData.impostor_count = impostorCount;
        }

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

      case 'leave_room': {
        // Allow players to leave (delete their own record)
        const { error } = await supabase
          .from('room_players')
          .delete()
          .eq('room_id', roomId)
          .eq('player_id', playerId);

        if (error) {
          console.error('Error leaving room:', error);
          throw new Error('Failed to leave room');
        }

        console.log(`Player ${playerId} left room ${roomId}`);
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

      case 'get_players': {
        // Validate roomId
        const roomIdResult = uuidSchema.safeParse(roomId);
        if (!roomIdResult.success) {
          return new Response(
            JSON.stringify({ error: 'Invalid room ID format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Return only non-sensitive player data
        const { data: players, error } = await supabase
          .from('room_players')
          .select('id, player_id, player_name, is_host, joined_at')
          .eq('room_id', roomId)
          .order('joined_at');

        if (error) {
          throw new Error('Failed to get players');
        }

        return new Response(
          JSON.stringify({ players }),
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
    const errorId = crypto.randomUUID().slice(0, 8);
    
    // Log full details server-side for debugging
    console.error(`Error ${errorId} in game-actions:`, {
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Return safe generic message to client (no internal details)
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.',
        errorId, // User can share this with support for debugging
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
