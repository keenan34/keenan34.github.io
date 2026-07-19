CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  year_label text,
  starts_on date,
  ends_on date,
  is_current boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'upcoming',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seasons_status_check CHECK (status IN ('upcoming', 'active', 'completed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS seasons_one_current_idx
  ON seasons (is_current)
  WHERE is_current = true;

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  display_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, slug)
);

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  image_url text,
  is_temp boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS players
  ADD COLUMN IF NOT EXISTS is_temp boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  jersey_number text,
  roster_status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, team_id, player_id),
  CONSTRAINT team_players_roster_status_check CHECK (roster_status IN ('active', 'inactive', 'removed'))
);

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  game_number integer NOT NULL,
  public_game_id text,
  scheduled_at timestamptz,
  venue text,
  home_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  away_team_id uuid NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  home_score integer,
  away_score integer,
  status text NOT NULL DEFAULT 'scheduled',
  period integer NOT NULL DEFAULT 1,
  home_first_half_fouls integer,
  away_first_half_fouls integer,
  clock_seconds_remaining integer NOT NULL DEFAULT 1200,
  clock_status text NOT NULL DEFAULT 'stopped',
  clock_updated_at timestamptz NOT NULL DEFAULT now(),
  youtube_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, week_number, game_number),
  UNIQUE (season_id, public_game_id),
  CONSTRAINT games_status_check CHECK (status IN ('scheduled', 'live', 'final', 'cancelled')),
  CONSTRAINT games_period_check CHECK (period IN (1, 2)),
  CONSTRAINT games_home_first_half_fouls_check CHECK (
    home_first_half_fouls IS NULL OR home_first_half_fouls >= 0
  ),
  CONSTRAINT games_away_first_half_fouls_check CHECK (
    away_first_half_fouls IS NULL OR away_first_half_fouls >= 0
  ),
  CONSTRAINT games_clock_seconds_check CHECK (
    clock_seconds_remaining >= 0
    AND clock_seconds_remaining <= 1200
  ),
  CONSTRAINT games_clock_status_check CHECK (clock_status IN ('stopped', 'running', 'halftime', 'final')),
  CONSTRAINT games_different_teams_check CHECK (home_team_id <> away_team_id),
  CONSTRAINT games_home_score_check CHECK (home_score IS NULL OR home_score >= 0),
  CONSTRAINT games_away_score_check CHECK (away_score IS NULL OR away_score >= 0)
);

ALTER TABLE IF EXISTS games
  ADD COLUMN IF NOT EXISTS period integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS home_first_half_fouls integer,
  ADD COLUMN IF NOT EXISTS away_first_half_fouls integer,
  ADD COLUMN IF NOT EXISTS clock_seconds_remaining integer NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS clock_status text NOT NULL DEFAULT 'stopped',
  ADD COLUMN IF NOT EXISTS clock_updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS game_player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  did_play boolean NOT NULL DEFAULT true,
  points integer NOT NULL DEFAULT 0,
  fgm integer NOT NULL DEFAULT 0,
  fga integer NOT NULL DEFAULT 0,
  two_pm integer NOT NULL DEFAULT 0,
  two_pa integer NOT NULL DEFAULT 0,
  three_pm integer NOT NULL DEFAULT 0,
  three_pa integer NOT NULL DEFAULT 0,
  ftm integer NOT NULL DEFAULT 0,
  fta integer NOT NULL DEFAULT 0,
  rebounds integer NOT NULL DEFAULT 0,
  assists integer NOT NULL DEFAULT 0,
  turnovers integer NOT NULL DEFAULT 0,
  fouls integer NOT NULL DEFAULT 0,
  steals_blocks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, player_id),
  CONSTRAINT game_player_stats_nonnegative_check CHECK (
    points >= 0
    AND fgm >= 0
    AND fga >= 0
    AND two_pm >= 0
    AND two_pa >= 0
    AND three_pm >= 0
    AND three_pa >= 0
    AND ftm >= 0
    AND fta >= 0
    AND rebounds >= 0
    AND assists >= 0
    AND turnovers >= 0
    AND fouls >= 0
    AND steals_blocks >= 0
  ),
  CONSTRAINT game_player_stats_makes_attempts_check CHECK (
    fgm <= fga
    AND two_pm <= two_pa
    AND three_pm <= three_pa
    AND ftm <= fta
  )
);

CREATE TABLE IF NOT EXISTS game_team_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
  finalized_at timestamptz,
  finalized_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, team_id),
  CONSTRAINT game_team_status_status_check CHECK (status IN ('draft', 'finalized'))
);

CREATE TABLE IF NOT EXISTS game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  admin_username text,
  event_type text NOT NULL,
  before_stats jsonb,
  after_stats jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_events_game_created_idx
  ON game_events (game_id, created_at DESC);

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'scorer'))
);
