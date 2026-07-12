-- Persist per-team timeouts used so the admin live game page can sync them
-- across devices in real time instead of tracking them in local state only.
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS home_timeouts_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS away_timeouts_used integer NOT NULL DEFAULT 0;
