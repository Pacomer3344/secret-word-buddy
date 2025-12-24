-- Fix the view to use SECURITY INVOKER instead of SECURITY DEFINER
-- Drop and recreate the view with explicit SECURITY INVOKER

DROP VIEW IF EXISTS public.room_players_safe;

CREATE VIEW public.room_players_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  player_id,
  player_name,
  is_host,
  joined_at,
  room_id
FROM public.room_players;

-- Re-grant SELECT on the safe view
GRANT SELECT ON public.room_players_safe TO anon;
GRANT SELECT ON public.room_players_safe TO authenticated;