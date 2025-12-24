-- Fix SECURITY DEFINER view issue: Drop the view and use a different approach
-- We'll restrict the SELECT policy and use Edge Function for sensitive data

DROP VIEW IF EXISTS public.room_players_public;

-- The "Anyone can view players basic info" policy stays but clients will only query non-sensitive columns
-- The Edge Function will handle secure role/word delivery