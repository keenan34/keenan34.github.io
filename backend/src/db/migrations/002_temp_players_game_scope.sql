-- Temporary (guest) players should exist only for the single game/week they are
-- added to. Permanent roster members keep game_id = NULL (they appear in every
-- game that season); temp players carry the id of the game they were added to so
-- they only show up — and can only be removed — for that game.
ALTER TABLE team_players
  ADD COLUMN IF NOT EXISTS game_id uuid REFERENCES games(id) ON DELETE CASCADE;

-- Backfill existing temp players: tie each one to the game where it has stats so
-- previously-added guests stop leaking into the team's other games.
UPDATE team_players tp
SET game_id = gps.game_id
FROM game_player_stats gps, players p
WHERE gps.player_id = tp.player_id
  AND gps.team_id = tp.team_id
  AND p.id = tp.player_id
  AND p.is_temp = true
  AND tp.game_id IS NULL;
