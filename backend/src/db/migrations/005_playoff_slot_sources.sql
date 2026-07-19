-- Records which placeholder ("Winner") team originally seeds each playoff slot,
-- so bracket resolution is reversible: a slot shows the actual winner while its
-- source game is decided, and snaps back to the placeholder if that game is
-- reset/un-finalized.

ALTER TABLE IF EXISTS games
  ADD COLUMN IF NOT EXISTS home_source_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS away_source_team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
