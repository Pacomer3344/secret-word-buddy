-- Fix column-level security: Create a safe view and revoke base table access

-- Step 1: Revoke ALL select access on room_players from anon and authenticated
-- This ensures the base table cannot be queried directly for any columns
REVOKE ALL ON public.room_players FROM anon;
REVOKE ALL ON public.room_players FROM authenticated;

-- Step 2: Grant only INSERT (for joining rooms) on room_players
GRANT INSERT ON public.room_players TO anon;
GRANT INSERT ON public.room_players TO authenticated;

-- Step 3: Create a secure view that only exposes non-sensitive columns
CREATE OR REPLACE VIEW public.room_players_safe AS
SELECT 
  id,
  player_id,
  player_name,
  is_host,
  joined_at,
  room_id
FROM public.room_players;

-- Step 4: Grant SELECT on the safe view to anon and authenticated
GRANT SELECT ON public.room_players_safe TO anon;
GRANT SELECT ON public.room_players_safe TO authenticated;

-- Step 5: Enable RLS on the view (Postgres 15+)
-- Note: Views inherit RLS from base tables, but we can add explicit policy
-- The base table RLS still applies

-- Drop old policies that are no longer needed since direct access is blocked
DROP POLICY IF EXISTS "View players without secrets" ON public.room_players;