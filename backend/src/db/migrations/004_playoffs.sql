-- Playoff bracket support.
--
-- teams.is_placeholder marks stand-in teams used for undetermined bracket
-- slots (e.g. "5 PM Winner"). These are excluded from standings, roster, and
-- team listings so they never pollute season data.
--
-- games.is_playoff flags a game as part of the playoff round so the public
-- schedule can pin the bracket to the top.

ALTER TABLE IF EXISTS teams
  ADD COLUMN IF NOT EXISTS is_placeholder boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS games
  ADD COLUMN IF NOT EXISTS is_playoff boolean NOT NULL DEFAULT false;
