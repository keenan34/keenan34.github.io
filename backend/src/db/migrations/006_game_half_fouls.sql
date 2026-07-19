-- Preserve the first-half team-foul cutoff so the live admin logger can
-- restore separate first- and second-half counts after a reload.
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS home_first_half_fouls integer,
  ADD COLUMN IF NOT EXISTS away_first_half_fouls integer;

ALTER TABLE games
  DROP CONSTRAINT IF EXISTS games_home_first_half_fouls_check,
  ADD CONSTRAINT games_home_first_half_fouls_check CHECK (
    home_first_half_fouls IS NULL OR home_first_half_fouls >= 0
  ),
  DROP CONSTRAINT IF EXISTS games_away_first_half_fouls_check,
  ADD CONSTRAINT games_away_first_half_fouls_check CHECK (
    away_first_half_fouls IS NULL OR away_first_half_fouls >= 0
  );
