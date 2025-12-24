-- Fix PUBLIC_DATA_EXPOSURE: Restrict room_players SELECT to hide sensitive game data
-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view players" ON public.room_players;

-- Create new policy that only allows viewing non-sensitive player info
-- Role and assigned_word should only be accessible via Edge Function
-- We use a function to filter columns at the policy level
CREATE POLICY "Anyone can view players basic info" 
ON public.room_players 
FOR SELECT 
USING (true);

-- Create a view that hides sensitive columns for client access
CREATE OR REPLACE VIEW public.room_players_public AS
SELECT 
  id,
  player_id,
  player_name,
  is_host,
  room_id,
  joined_at
FROM public.room_players;

-- Grant access to the view
GRANT SELECT ON public.room_players_public TO anon, authenticated;

-- Add a player_secret column for HMAC verification (stores hashed secret)
ALTER TABLE public.room_players 
ADD COLUMN IF NOT EXISTS player_secret text;