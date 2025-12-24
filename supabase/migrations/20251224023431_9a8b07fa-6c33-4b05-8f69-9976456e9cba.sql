-- Fix RLS policies to prevent direct client access to sensitive operations
-- All mutations must go through the Edge Function which validates host/player

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Only host can update rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Only host can delete rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Anyone can view players basic info" ON public.room_players;
DROP POLICY IF EXISTS "Players can update own record" ON public.room_players;
DROP POLICY IF EXISTS "Anyone can leave rooms" ON public.room_players;

-- Create restrictive policies for game_rooms
-- No direct UPDATE allowed - must use Edge Function
CREATE POLICY "Block direct room updates"
ON public.game_rooms FOR UPDATE
USING (false)
WITH CHECK (false);

-- No direct DELETE allowed - must use Edge Function  
CREATE POLICY "Block direct room deletes"
ON public.game_rooms FOR DELETE
USING (false);

-- Create restrictive policies for room_players
-- SELECT only shows non-sensitive columns (hide role, assigned_word, player_secret)
-- We use a view for safe access, but also restrict direct table access
CREATE POLICY "View players without secrets"
ON public.room_players FOR SELECT
USING (true);

-- No direct UPDATE allowed - must use Edge Function
CREATE POLICY "Block direct player updates"
ON public.room_players FOR UPDATE
USING (false)
WITH CHECK (false);

-- No direct DELETE allowed - must use Edge Function
CREATE POLICY "Block direct player deletes"
ON public.room_players FOR DELETE
USING (false);

-- Revoke column-level access to sensitive fields from anon role
REVOKE SELECT (role, assigned_word, player_secret) ON public.room_players FROM anon;
REVOKE SELECT (role, assigned_word, player_secret) ON public.room_players FROM authenticated;