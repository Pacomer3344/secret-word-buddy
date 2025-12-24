-- Add explicit SELECT blocking policy on room_players for defense-in-depth
CREATE POLICY "Block direct room_players select"
ON public.room_players FOR SELECT
USING (false);