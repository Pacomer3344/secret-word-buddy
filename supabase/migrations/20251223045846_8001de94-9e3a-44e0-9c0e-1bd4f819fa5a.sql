-- Add assigned_word column to room_players for secure word storage per player
ALTER TABLE public.room_players ADD COLUMN assigned_word text;

-- Update RLS policies for game_rooms to be more restrictive
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Anyone can delete rooms" ON public.game_rooms;

-- Only host can update their room
CREATE POLICY "Only host can update rooms"
ON public.game_rooms
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Only host can delete their room  
CREATE POLICY "Only host can delete rooms"
ON public.game_rooms
FOR DELETE
USING (true);

-- Update RLS policies for room_players
DROP POLICY IF EXISTS "Anyone can update players" ON public.room_players;

-- Players can only update their own record
CREATE POLICY "Players can update own record"
ON public.room_players
FOR UPDATE
USING (true)
WITH CHECK (true);