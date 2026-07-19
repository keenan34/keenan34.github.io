const { Router } = require("express");
const fs = require("fs/promises");
const path = require("path");
const { pool } = require("../../db/pool");

const ALLOWED_GAME_STATUSES = ["scheduled", "live", "final", "cancelled"];
const ALLOWED_CLOCK_STATUSES = ["stopped", "running", "halftime", "final"];
const HALF_SECONDS = 20 * 60;
const TIMEOUTS_PER_GAME = 2;
const STAT_FIELDS = [
  "points",
  "fgm",
  "fga",
  "twoPm",
  "twoPa",
  "threePm",
  "threePa",
  "ftm",
  "fta",
  "rebounds",
  "assists",
  "turnovers",
  "fouls",
  "stealsBlocks",
];
const STAT_COLUMN_BY_FIELD = {
  points: "points",
  fgm: "fgm",
  fga: "fga",
  twoPm: "two_pm",
  twoPa: "two_pa",
  threePm: "three_pm",
  threePa: "three_pa",
  ftm: "ftm",
  fta: "fta",
  rebounds: "rebounds",
  assists: "assists",
  turnovers: "turnovers",
  fouls: "fouls",
  stealsBlocks: "steals_blocks",
};
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_SEASONS_DIR = path.resolve(
  __dirname,
  "../../../../frontend/public/seasons"
);

function isUuid(value) {
  return UUID_PATTERN.test(value);
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function statPercent(made, attempts) {
  if (!attempts) return 0;
  const value = (made / attempts) * 100;
  return Number.isInteger(value) ? value : Number(value.toFixed(1));
}

function legacyPlayerStats(player) {
  return {
    Player: player.name,
    Points: player.points ?? 0,
    FGM: player.fgm ?? 0,
    FGA: player.fga ?? 0,
    "FG %": statPercent(player.fgm ?? 0, player.fga ?? 0),
    "2 PTM": player.twoPm ?? 0,
    "2 PTA": player.twoPa ?? 0,
    "2 Pt %": statPercent(player.twoPm ?? 0, player.twoPa ?? 0),
    "3 PTM": player.threePm ?? 0,
    "3 PTA": player.threePa ?? 0,
    "3 Pt %": statPercent(player.threePm ?? 0, player.threePa ?? 0),
    FTM: player.ftm ?? 0,
    FTA: player.fta ?? 0,
    "FT %": statPercent(player.ftm ?? 0, player.fta ?? 0),
    REB: player.rebounds ?? 0,
    AST: player.assists ?? 0,
    TOs: player.turnovers ?? 0,
    Fouls: player.fouls ?? 0,
    "STLS/BLKS": player.stealsBlocks ?? 0,
  };
}

function legacyTeamBoxScore(rosters, teamId, teamName) {
  const roster = rosters.find((entry) => entry.team.id === teamId);

  return {
    name: teamName,
    players: (roster?.players || []).map(legacyPlayerStats),
  };
}

async function clearGameFromWeekJson(liveGameState) {
  const { game } = liveGameState || {};
  if (!game?.season?.slug || !game.weekNumber || !game.gameNumber) return;

  const weekFile = path.join(
    PUBLIC_SEASONS_DIR,
    game.season.slug,
    `week${game.weekNumber}.json`
  );

  let weekData = {};
  try {
    weekData = JSON.parse(await fs.readFile(weekFile, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return;
    throw err;
  }

  delete weekData[`game${game.gameNumber}`];

  if (Object.keys(weekData).length === 0) {
    await fs.unlink(weekFile).catch(() => {});
  } else {
    await fs.writeFile(weekFile, `${JSON.stringify(weekData, null, 2)}\n`);
  }
}

async function publishGameToWeekJson(liveGameState) {
  const { game, rosters } = liveGameState || {};
  if (!game?.season?.slug || !game.weekNumber || !game.gameNumber) {
    throw new Error("Game is missing season, week, or game number");
  }

  const seasonDir = path.join(PUBLIC_SEASONS_DIR, game.season.slug);
  const weekFile = path.join(seasonDir, `week${game.weekNumber}.json`);
  let weekData = {};

  try {
    weekData = JSON.parse(await fs.readFile(weekFile, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  weekData[`game${game.gameNumber}`] = {
    teamA: legacyTeamBoxScore(rosters, game.homeTeam.id, game.homeTeam.name),
    teamB: legacyTeamBoxScore(rosters, game.awayTeam.id, game.awayTeam.name),
  };

  await fs.mkdir(seasonDir, { recursive: true });
  await fs.writeFile(weekFile, `${JSON.stringify(weekData, null, 2)}\n`);

  return weekFile;
}

function defaultPlayerStats() {
  return {
    didPlay: true,
    points: 0,
    fgm: 0,
    fga: 0,
    twoPm: 0,
    twoPa: 0,
    threePm: 0,
    threePa: 0,
    ftm: 0,
    fta: 0,
    rebounds: 0,
    assists: 0,
    turnovers: 0,
    fouls: 0,
    stealsBlocks: 0,
  };
}

function validatePlayerStatsPayload(body) {
  const errors = [];
  const normalized = {};

  STAT_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      const value = body[field];
      if (!Number.isInteger(value) || value < 0) {
        errors.push(`${field} must be a non-negative integer`);
      } else {
        normalized[field] = value;
      }
    }
  });

  if (Object.prototype.hasOwnProperty.call(body, "didPlay")) {
    if (typeof body.didPlay !== "boolean") {
      errors.push("didPlay must be a boolean");
    } else {
      normalized.didPlay = body.didPlay;
    }
  }

  return { errors, normalized };
}

function validateMadeStats(stats) {
  const errors = [];

  if (stats.fgm > stats.fga) errors.push("fgm cannot exceed fga");
  if (stats.twoPm > stats.twoPa) errors.push("twoPm cannot exceed twoPa");
  if (stats.threePm > stats.threePa) {
    errors.push("threePm cannot exceed threePa");
  }
  if (stats.ftm > stats.fta) errors.push("ftm cannot exceed fta");

  return errors;
}

function normalizeStatsForEvent(stats) {
  const normalized = {
    didPlay: Boolean(stats.didPlay),
  };

  STAT_FIELDS.forEach((field) => {
    normalized[field] = stats[field] ?? 0;
  });

  return normalized;
}

function didStatsChange(beforeStats, afterStats) {
  if (beforeStats.didPlay !== afterStats.didPlay) return true;
  return STAT_FIELDS.some((field) => beforeStats[field] !== afterStats[field]);
}

function clockStateFromRow(row) {
  const storedSeconds = row.clockSecondsRemaining ?? HALF_SECONDS;
  const updatedAt = row.clockUpdatedAt
    ? new Date(row.clockUpdatedAt).getTime()
    : Date.now();
  const elapsedSeconds =
    row.clockStatus === "running"
      ? Math.max(0, Math.floor((Date.now() - updatedAt) / 1000))
      : 0;
  const secondsRemaining = Math.max(0, storedSeconds - elapsedSeconds);

  return {
    period: row.period || 1,
    secondsRemaining,
    status:
      row.clockStatus === "running" && secondsRemaining === 0
        ? "stopped"
        : row.clockStatus || "stopped",
    updatedAt: row.clockUpdatedAt,
  };
}

function mapAdminGame(row) {
  return {
    id: row.id,
    season: {
      id: row.seasonId,
      slug: row.seasonSlug,
      name: row.seasonName,
    },
    weekNumber: row.weekNumber,
    gameNumber: row.gameNumber,
    publicGameId: row.publicGameId,
    scheduledAt: row.scheduledAt,
    date: row.date,
    time: row.time,
    venue: row.venue,
    status: row.status,
    isPlayoff: row.isPlayoff ?? false,
    clock: clockStateFromRow(row),
    youtubeUrl: row.youtubeUrl,
    homeTeam: {
      id: row.homeTeamId,
      name: row.homeTeamName,
      slug: row.homeTeamSlug,
      score: row.homeScore,
      timeoutsUsed: row.homeTimeoutsUsed,
      isPlaceholder: row.homeTeamIsPlaceholder ?? false,
    },
    awayTeam: {
      id: row.awayTeamId,
      name: row.awayTeamName,
      slug: row.awayTeamSlug,
      score: row.awayScore,
      timeoutsUsed: row.awayTimeoutsUsed,
      isPlaceholder: row.awayTeamIsPlaceholder ?? false,
    },
  };
}

function mapPlayerStats(row) {
  return {
    id: row.playerId,
    name: row.playerName,
    slug: row.playerSlug,
    imgUrl: row.imgUrl,
    isTemp: row.isTemp,
    number: row.number,
    rosterStatus: row.rosterStatus,
    didPlay: row.didPlay,
    points: row.points,
    fgm: row.fgm,
    fga: row.fga,
    twoPm: row.twoPm,
    twoPa: row.twoPa,
    threePm: row.threePm,
    threePa: row.threePa,
    ftm: row.ftm,
    fta: row.fta,
    rebounds: row.rebounds,
    assists: row.assists,
    turnovers: row.turnovers,
    fouls: row.fouls,
    stealsBlocks: row.stealsBlocks,
  };
}

function mapGameEvent(row) {
  return {
    id: row.id,
    gameId: row.gameId,
    team: {
      id: row.teamId,
      name: row.teamName,
    },
    player: {
      id: row.playerId,
      name: row.playerName,
      imgUrl: row.playerImgUrl,
    },
    adminUsername: row.adminUsername,
    eventType: row.eventType,
    beforeStats: row.beforeStats,
    afterStats: row.afterStats,
    createdAt: row.createdAt,
  };
}

async function getGame(gameId) {
  if (!isUuid(gameId)) return null;

  const { rows } = await pool.query(
    `
      SELECT
        g.id,
        s.id AS "seasonId",
        s.slug AS "seasonSlug",
        s.name AS "seasonName",
        g.week_number AS "weekNumber",
        g.game_number AS "gameNumber",
        g.public_game_id AS "publicGameId",
        g.scheduled_at AS "scheduledAt",
        CASE
          WHEN g.scheduled_at IS NULL THEN NULL
          ELSE to_char(g.scheduled_at AT TIME ZONE 'America/Chicago', 'FMMM/FMDD/YYYY')
        END AS date,
        CASE
          WHEN g.scheduled_at IS NULL THEN NULL
          ELSE to_char(g.scheduled_at AT TIME ZONE 'America/Chicago', 'FMHH12:MI AM')
        END AS time,
        g.venue,
        g.status,
        g.is_playoff AS "isPlayoff",
        g.period,
        g.clock_seconds_remaining AS "clockSecondsRemaining",
        g.clock_status AS "clockStatus",
        g.clock_updated_at AS "clockUpdatedAt",
        g.youtube_url AS "youtubeUrl",
        home.id AS "homeTeamId",
        home.name AS "homeTeamName",
        home.slug AS "homeTeamSlug",
        home.is_placeholder AS "homeTeamIsPlaceholder",
        g.home_score AS "homeScore",
        g.home_timeouts_used AS "homeTimeoutsUsed",
        away.id AS "awayTeamId",
        away.name AS "awayTeamName",
        away.slug AS "awayTeamSlug",
        away.is_placeholder AS "awayTeamIsPlaceholder",
        g.away_score AS "awayScore",
        g.away_timeouts_used AS "awayTimeoutsUsed"
      FROM games g
      JOIN seasons s ON s.id = g.season_id
      JOIN teams home ON home.id = g.home_team_id
      JOIN teams away ON away.id = g.away_team_id
      WHERE g.id = $1
    `,
    [gameId]
  );

  return rows[0] ? mapAdminGame(rows[0]) : null;
}

async function getLiveGameState(gameId) {
  const game = await getGame(gameId);

  if (!game) return null;

  const [playerResult, teamStatusResult] = await Promise.all([
    pool.query(
    `
      SELECT
        t.id AS "teamId",
        t.name AS "teamName",
        t.slug AS "teamSlug",
        p.id AS "playerId",
        p.name AS "playerName",
        p.slug AS "playerSlug",
        p.image_url AS "imgUrl",
        p.is_temp AS "isTemp",
        tp.jersey_number AS "number",
        tp.roster_status AS "rosterStatus",
        COALESCE(gps.did_play, false) AS "didPlay",
        COALESCE(gps.points, 0) AS points,
        COALESCE(gps.fgm, 0) AS fgm,
        COALESCE(gps.fga, 0) AS fga,
        COALESCE(gps.two_pm, 0) AS "twoPm",
        COALESCE(gps.two_pa, 0) AS "twoPa",
        COALESCE(gps.three_pm, 0) AS "threePm",
        COALESCE(gps.three_pa, 0) AS "threePa",
        COALESCE(gps.ftm, 0) AS ftm,
        COALESCE(gps.fta, 0) AS fta,
        COALESCE(gps.rebounds, 0) AS rebounds,
        COALESCE(gps.assists, 0) AS assists,
        COALESCE(gps.turnovers, 0) AS turnovers,
        COALESCE(gps.fouls, 0) AS fouls,
        COALESCE(gps.steals_blocks, 0) AS "stealsBlocks"
      FROM games g
      JOIN team_players tp
        ON tp.season_id = g.season_id
        AND tp.team_id IN (g.home_team_id, g.away_team_id)
        AND (tp.game_id IS NULL OR tp.game_id = g.id)
      JOIN teams t ON t.id = tp.team_id
      JOIN players p ON p.id = tp.player_id
      LEFT JOIN game_player_stats gps
        ON gps.game_id = g.id
        AND gps.team_id = tp.team_id
        AND gps.player_id = tp.player_id
      WHERE g.id = $1
        AND tp.roster_status <> 'removed'
      ORDER BY
        CASE WHEN t.id = g.home_team_id THEN 0 ELSE 1 END,
        NULLIF(regexp_replace(tp.jersey_number, '[^0-9]', '', 'g'), '')::int NULLS LAST,
        p.name
    `,
    [gameId]
    ),
    pool.query(
      `
        SELECT
          team_id AS "teamId",
          status,
          finalized_at AS "finalizedAt",
          finalized_by AS "finalizedBy"
        FROM game_team_status
        WHERE game_id = $1
      `,
      [gameId]
    ),
  ]);

  const teamStatusById = new Map(
    teamStatusResult.rows.map((row) => [
      row.teamId,
      {
        status: row.status,
        finalizedAt: row.finalizedAt,
        finalizedBy: row.finalizedBy,
      },
    ])
  );

  function teamStatus(teamId) {
    return (
      teamStatusById.get(teamId) || {
        status: "draft",
        finalizedAt: null,
        finalizedBy: null,
      }
    );
  }

  const rosterByTeamId = new Map([
    [
      game.homeTeam.id,
      {
        team: {
          id: game.homeTeam.id,
          name: game.homeTeam.name,
          slug: game.homeTeam.slug,
          ...teamStatus(game.homeTeam.id),
        },
        players: [],
      },
    ],
    [
      game.awayTeam.id,
      {
        team: {
          id: game.awayTeam.id,
          name: game.awayTeam.name,
          slug: game.awayTeam.slug,
          ...teamStatus(game.awayTeam.id),
        },
        players: [],
      },
    ],
  ]);

  playerResult.rows.forEach((row) => {
    const roster = rosterByTeamId.get(row.teamId);
    if (roster) roster.players.push(mapPlayerStats(row));
  });

  return {
    game,
    rosters: Array.from(rosterByTeamId.values()),
    playerStats: playerResult.rows.map((row) => ({
      teamId: row.teamId,
      teamName: row.teamName,
      ...mapPlayerStats(row),
    })),
  };
}

async function getGameTeamIds(client, gameId) {
  const { rows } = await client.query(
    `
      SELECT
        home_team_id AS "homeTeamId",
        away_team_id AS "awayTeamId"
      FROM games
      WHERE id = $1
      LIMIT 1
    `,
    [gameId]
  );

  return rows[0] || null;
}

async function finalizeTeam(client, gameId, teamId, finalizedBy) {
  const gameTeams = await getGameTeamIds(client, gameId);

  if (
    !gameTeams ||
    (teamId !== gameTeams.homeTeamId && teamId !== gameTeams.awayTeamId)
  ) {
    return null;
  }

  await recalculateTeamScores(client, gameId);

  await client.query(
    `
      INSERT INTO game_team_status (
        game_id,
        team_id,
        status,
        finalized_at,
        finalized_by
      )
      VALUES ($1, $2, 'finalized', now(), $3)
      ON CONFLICT (game_id, team_id)
      DO UPDATE SET
        status = 'finalized',
        finalized_at = COALESCE(game_team_status.finalized_at, EXCLUDED.finalized_at),
        finalized_by = EXCLUDED.finalized_by,
        updated_at = now()
    `,
    [gameId, teamId, finalizedBy]
  );

  const { rows } = await client.query(
    `
      SELECT COUNT(*)::int AS count
      FROM game_team_status
      WHERE game_id = $1
        AND team_id IN ($2, $3)
        AND status = 'finalized'
    `,
    [gameId, gameTeams.homeTeamId, gameTeams.awayTeamId]
  );

  const isGameFinal = rows[0].count === 2;

  if (isGameFinal) {
    await client.query(
      `
        UPDATE games
        SET status = 'final',
            clock_status = 'final',
            clock_seconds_remaining = 0,
            clock_updated_at = now(),
            updated_at = now()
        WHERE id = $1
      `,
      [gameId]
    );
  }

  return { isGameFinal };
}

async function reopenTeam(client, gameId, teamId) {
  const gameTeams = await getGameTeamIds(client, gameId);

  if (
    !gameTeams ||
    (teamId !== gameTeams.homeTeamId && teamId !== gameTeams.awayTeamId)
  ) {
    return null;
  }

  await client.query(
    `
      INSERT INTO game_team_status (
        game_id,
        team_id,
        status,
        finalized_at,
        finalized_by
      )
      VALUES ($1, $2, 'draft', NULL, NULL)
      ON CONFLICT (game_id, team_id)
      DO UPDATE SET
        status = 'draft',
        finalized_at = NULL,
        finalized_by = NULL,
        updated_at = now()
    `,
    [gameId, teamId]
  );

  await client.query(
    `
      UPDATE games
      SET status = 'live',
          clock_status = CASE
            WHEN clock_status = 'final' THEN 'stopped'
            ELSE clock_status
          END,
          clock_updated_at = now(),
          updated_at = now()
      WHERE id = $1
        AND status = 'final'
    `,
    [gameId]
  );

  return { reopenedTeamId: teamId };
}

async function updateGameStatus(gameId, status) {
  if (!isUuid(gameId)) return null;

  const { rows } = await pool.query(
    `
      UPDATE games
      SET status = $2,
          clock_status = CASE
            WHEN $2 = 'final' THEN 'final'
            WHEN $2 IN ('scheduled', 'live') AND clock_status = 'final' THEN 'stopped'
            ELSE clock_status
          END,
          clock_updated_at = CASE
            WHEN $2 = 'final' OR clock_status = 'final' THEN now()
            ELSE clock_updated_at
          END,
          updated_at = now()
      WHERE id = $1
      RETURNING id
    `,
    [gameId, status]
  );

  if (!rows.length) return null;
  return getGame(rows[0].id);
}

async function swapGameHomeAway(gameId) {
  if (!isUuid(gameId)) return null;

  const { rows } = await pool.query(
    `
      UPDATE games
      SET home_team_id = away_team_id,
          away_team_id = home_team_id,
          home_score = away_score,
          away_score = home_score,
          home_timeouts_used = away_timeouts_used,
          away_timeouts_used = home_timeouts_used,
          updated_at = now()
      WHERE id = $1
      RETURNING id
    `,
    [gameId]
  );

  if (!rows.length) return null;
  return getLiveGameState(rows[0].id);
}

async function recalculateTeamScores(client, gameId) {
  await client.query(
    `
      UPDATE games g
      SET
        home_score = COALESCE((
          SELECT SUM(gps.points)
          FROM game_player_stats gps
          WHERE gps.game_id = g.id
            AND gps.team_id = g.home_team_id
        ), 0),
        away_score = COALESCE((
          SELECT SUM(gps.points)
          FROM game_player_stats gps
          WHERE gps.game_id = g.id
            AND gps.team_id = g.away_team_id
        ), 0),
        updated_at = now()
      WHERE g.id = $1
    `,
    [gameId]
  );
}

async function upsertPlayerStats(client, gameId, teamId, playerId, stats) {
  const insertColumns = [
    "game_id",
    "team_id",
    "player_id",
    "did_play",
    ...STAT_FIELDS.map((field) => STAT_COLUMN_BY_FIELD[field]),
  ];
  const insertValues = [
    gameId,
    teamId,
    playerId,
    stats.didPlay,
    ...STAT_FIELDS.map((field) => stats[field]),
  ];
  const placeholders = insertValues.map((_, index) => `$${index + 1}`);
  const updateAssignments = [
    "team_id = EXCLUDED.team_id",
    "did_play = EXCLUDED.did_play",
    ...STAT_FIELDS.map(
      (field) =>
        `${STAT_COLUMN_BY_FIELD[field]} = EXCLUDED.${STAT_COLUMN_BY_FIELD[field]}`
    ),
    "updated_at = now()",
  ];

  return client.query(
    `
      INSERT INTO game_player_stats (${insertColumns.join(", ")})
      VALUES (${placeholders.join(", ")})
      ON CONFLICT (game_id, player_id)
      DO UPDATE SET ${updateAssignments.join(", ")}
      RETURNING
        team_id AS "teamId",
        player_id AS "playerId",
        did_play AS "didPlay",
        points,
        fgm,
        fga,
        two_pm AS "twoPm",
        two_pa AS "twoPa",
        three_pm AS "threePm",
        three_pa AS "threePa",
        ftm,
        fta,
        rebounds,
        assists,
        turnovers,
        fouls,
        steals_blocks AS "stealsBlocks"
    `,
    insertValues
  );
}

// A placeholder team is named for the tip-off it feeds from, e.g.
// "5 PM Winner" -> "5 PM". Returns null for non-placeholder names.
function placeholderHourLabel(name) {
  const match = String(name || "").match(/^(\d{1,2})\s*(AM|PM)\b/i);
  return match ? `${Number(match[1])} ${match[2].toUpperCase()}` : null;
}

// Auto-advance the playoff bracket: for every "<H> PM Winner" placeholder that
// still occupies a game slot, look up the finished game played at that tip-off
// and, once it has a decisive result, replace the placeholder with the winner.
// Idempotent and safe to call after any finalize/score change. Returns the ids
// of games whose matchup changed.
async function resolvePlayoffBracket(db = pool) {
  const { rows: placeholders } = await db.query(`
    SELECT DISTINCT t.id, t.name, t.season_id AS "seasonId"
    FROM teams t
    WHERE t.is_placeholder = true
      AND EXISTS (
        SELECT 1 FROM games g
        WHERE g.home_team_id = t.id OR g.away_team_id = t.id
      )
  `);

  const changedGameIds = new Set();

  for (const placeholder of placeholders) {
    const hourLabel = placeholderHourLabel(placeholder.name);
    if (!hourLabel) continue;

    const { rows: sourceRows } = await db.query(
      `
        SELECT
          home_team_id AS "homeTeamId",
          away_team_id AS "awayTeamId",
          home_score AS "homeScore",
          away_score AS "awayScore",
          status
        FROM games
        WHERE season_id = $1
          AND is_playoff = true
          AND to_char(scheduled_at AT TIME ZONE 'America/Chicago', 'FMHH12 AM') = $2
        LIMIT 1
      `,
      [placeholder.seasonId, hourLabel]
    );

    const source = sourceRows[0];
    if (!source || source.status !== "final") continue;
    if (
      source.homeScore == null ||
      source.awayScore == null ||
      source.homeScore === source.awayScore
    ) {
      continue;
    }

    const winnerId =
      source.homeScore > source.awayScore
        ? source.homeTeamId
        : source.awayTeamId;

    // Guard against ever setting home === away (skips if the other slot already
    // holds the winner).
    const home = await db.query(
      `
        UPDATE games SET home_team_id = $1, updated_at = now()
        WHERE home_team_id = $2 AND away_team_id <> $1
        RETURNING id
      `,
      [winnerId, placeholder.id]
    );
    const away = await db.query(
      `
        UPDATE games SET away_team_id = $1, updated_at = now()
        WHERE away_team_id = $2 AND home_team_id <> $1
        RETURNING id
      `,
      [winnerId, placeholder.id]
    );

    [...home.rows, ...away.rows].forEach((row) => changedGameIds.add(row.id));
  }

  return [...changedGameIds];
}

function createGamesRouter({ broadcastLiveGameState } = {}) {
  const router = Router();

  async function notifyLiveGameState(gameId, event) {
    if (!broadcastLiveGameState) return;

    try {
      const liveGameState = await getLiveGameState(gameId);
      if (liveGameState) broadcastLiveGameState(gameId, liveGameState, event);
    } catch (err) {
      console.error("Failed to broadcast live game state", err);
    }
  }

  // Advance the bracket after a result changes, then push the updated matchup to
  // any dependent games that just had a "Winner" slot filled in.
  async function resolveBracketAndBroadcast() {
    try {
      const changedGameIds = await resolvePlayoffBracket(pool);
      for (const changedGameId of changedGameIds) {
        await notifyLiveGameState(changedGameId, "matchup-updated");
      }
    } catch (err) {
      console.error("Failed to resolve playoff bracket", err);
    }
  }

  router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        g.id,
        s.id AS "seasonId",
        s.slug AS "seasonSlug",
        s.name AS "seasonName",
        g.week_number AS "weekNumber",
        g.game_number AS "gameNumber",
        g.public_game_id AS "publicGameId",
        g.scheduled_at AS "scheduledAt",
        CASE
          WHEN g.scheduled_at IS NULL THEN NULL
          ELSE to_char(g.scheduled_at AT TIME ZONE 'America/Chicago', 'FMMM/FMDD/YYYY')
        END AS date,
        CASE
          WHEN g.scheduled_at IS NULL THEN NULL
          ELSE to_char(g.scheduled_at AT TIME ZONE 'America/Chicago', 'FMHH12:MI AM')
        END AS time,
        g.venue,
        g.status,
        g.is_playoff AS "isPlayoff",
        g.youtube_url AS "youtubeUrl",
        home.id AS "homeTeamId",
        home.name AS "homeTeamName",
        home.slug AS "homeTeamSlug",
        home.is_placeholder AS "homeTeamIsPlaceholder",
        g.home_score AS "homeScore",
        g.home_timeouts_used AS "homeTimeoutsUsed",
        away.id AS "awayTeamId",
        away.name AS "awayTeamName",
        away.slug AS "awayTeamSlug",
        away.is_placeholder AS "awayTeamIsPlaceholder",
        g.away_score AS "awayScore",
        g.away_timeouts_used AS "awayTimeoutsUsed"
      FROM games g
      JOIN seasons s ON s.id = g.season_id
      JOIN teams home ON home.id = g.home_team_id
      JOIN teams away ON away.id = g.away_team_id
      WHERE g.status IN ('scheduled', 'live', 'final')
      ORDER BY
        s.is_current DESC,
        s.starts_on DESC NULLS LAST,
        g.scheduled_at NULLS LAST,
        g.week_number,
        g.game_number
    `);

    res.json({
      games: rows.map(mapAdminGame),
    });
  } catch (err) {
    next(err);
  }
});

  router.get("/:gameId/live", async (req, res, next) => {
  try {
    const liveGameState = await getLiveGameState(req.params.gameId);

    if (!liveGameState) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    res.json(liveGameState);
  } catch (err) {
    next(err);
  }
});

  router.get("/:gameId/events", async (req, res, next) => {
  const { gameId } = req.params;

  if (!isUuid(gameId)) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `
        SELECT
          ge.id,
          ge.game_id AS "gameId",
          ge.team_id AS "teamId",
          t.name AS "teamName",
          ge.player_id AS "playerId",
          p.name AS "playerName",
          p.image_url AS "playerImgUrl",
          ge.admin_username AS "adminUsername",
          ge.event_type AS "eventType",
          ge.before_stats AS "beforeStats",
          ge.after_stats AS "afterStats",
          ge.created_at AS "createdAt"
        FROM game_events ge
        LEFT JOIN teams t ON t.id = ge.team_id
        LEFT JOIN players p ON p.id = ge.player_id
        WHERE ge.game_id = $1
        ORDER BY ge.created_at DESC
        LIMIT 50
      `,
      [gameId]
    );

    res.json({ events: rows.map(mapGameEvent) });
  } catch (err) {
    next(err);
  }
});

  router.delete("/:gameId/events", async (req, res, next) => {
  const { gameId } = req.params;

  if (!isUuid(gameId)) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  try {
    const game = await getGame(gameId);

    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    const result = await pool.query(
      "DELETE FROM game_events WHERE game_id = $1",
      [gameId]
    );

    res.json({ ok: true, deletedCount: result.rowCount });
  } catch (err) {
    next(err);
  }
});

  router.post("/:gameId/start", async (req, res, next) => {
  try {
    const game = await updateGameStatus(req.params.gameId, "live");

    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    res.json({ game });
    await notifyLiveGameState(req.params.gameId, "game-started");
  } catch (err) {
    next(err);
  }
});

  router.patch("/:gameId/status", async (req, res, next) => {
  try {
    const { status } = req.body || {};

    if (!ALLOWED_GAME_STATUSES.includes(status)) {
      res.status(400).json({
        error: "Invalid status",
        allowedStatuses: ALLOWED_GAME_STATUSES,
      });
      return;
    }

    const game = await updateGameStatus(req.params.gameId, status);

    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    res.json({ game });
    await notifyLiveGameState(req.params.gameId, "status-updated");
    await resolveBracketAndBroadcast();
  } catch (err) {
    next(err);
  }
});

  router.post("/:gameId/swap-home-away", async (req, res, next) => {
  try {
    const liveGameState = await swapGameHomeAway(req.params.gameId);

    if (!liveGameState) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    res.json(liveGameState);
    await notifyLiveGameState(req.params.gameId, "home-away-updated");
  } catch (err) {
    next(err);
  }
});


  router.post("/:gameId/teams/:teamId/temp-players", async (req, res, next) => {
  const { gameId, teamId } = req.params;

  if (!isUuid(gameId) || !isUuid(teamId)) {
    res.status(404).json({ error: "Game or team not found" });
    return;
  }

  const name = String(req.body?.name || "").trim();
  const number = String(req.body?.number || "").trim() || null;

  if (!name) {
    res.status(400).json({ error: "Player name is required" });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const gameResult = await client.query(
      `
        SELECT id, season_id AS "seasonId", home_team_id AS "homeTeamId", away_team_id AS "awayTeamId"
        FROM games
        WHERE id = $1
        LIMIT 1
      `,
      [gameId]
    );

    const game = gameResult.rows[0];
    if (!game || ![game.homeTeamId, game.awayTeamId].includes(teamId)) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Game or team not found" });
      return;
    }

    const baseSlug = slugify(name) || "temp_player";
    const slug = `${baseSlug}_${Date.now().toString(36)}`;

    const playerResult = await client.query(
      `
        INSERT INTO players (name, slug, is_temp)
        VALUES ($1, $2, true)
        RETURNING id
      `,
      [name, slug]
    );

    const playerId = playerResult.rows[0].id;

    await client.query(
      `
        INSERT INTO team_players (season_id, team_id, player_id, jersey_number, roster_status, game_id)
        VALUES ($1, $2, $3, $4, 'active', $5)
        ON CONFLICT (season_id, team_id, player_id) DO UPDATE
        SET jersey_number = EXCLUDED.jersey_number,
            roster_status = 'active',
            game_id = EXCLUDED.game_id,
            updated_at = now()
      `,
      [game.seasonId, teamId, playerId, number, gameId]
    );

    await upsertPlayerStats(client, gameId, teamId, playerId, {
      ...defaultPlayerStats(),
      didPlay: true,
    });

    await client.query("COMMIT");

    const liveGameState = await getLiveGameState(gameId);
    res.status(201).json(liveGameState);
    await notifyLiveGameState(gameId, "roster-updated");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

  router.delete("/:gameId/teams/:teamId/players/:playerId", async (req, res, next) => {
  const { gameId, teamId, playerId } = req.params;

  if (!isUuid(gameId) || !isUuid(teamId) || !isUuid(playerId)) {
    res.status(404).json({ error: "Game, team, or player not found" });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const gameResult = await client.query(
      `
        SELECT id, season_id AS "seasonId", home_team_id AS "homeTeamId", away_team_id AS "awayTeamId"
        FROM games
        WHERE id = $1
        LIMIT 1
      `,
      [gameId]
    );

    const game = gameResult.rows[0];
    if (!game || ![game.homeTeamId, game.awayTeamId].includes(teamId)) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Game, team, or player not found" });
      return;
    }

    const teamStatusResult = await client.query(
      `
        SELECT status
        FROM game_team_status
        WHERE game_id = $1 AND team_id = $2
        LIMIT 1
      `,
      [gameId, teamId]
    );

    if (teamStatusResult.rows[0]?.status === "finalized") {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: "Team is finalized. Reopen the team before removing players.",
      });
      return;
    }

    const rosterResult = await client.query(
      `
        SELECT tp.player_id, p.is_temp AS "isTemp"
        FROM team_players tp
        JOIN players p ON p.id = tp.player_id
        WHERE tp.season_id = $1
          AND tp.team_id = $2
          AND tp.player_id = $3
          AND tp.roster_status <> 'removed'
        LIMIT 1
      `,
      [game.seasonId, teamId, playerId]
    );

    const rosterPlayer = rosterResult.rows[0];

    if (!rosterPlayer) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Game, team, or player not found" });
      return;
    }

    if (!rosterPlayer.isTemp) {
      await client.query("ROLLBACK");
      res.status(403).json({ error: "Only temporary players can be removed." });
      return;
    }

    await client.query(
      `
        UPDATE team_players
        SET roster_status = 'removed',
            updated_at = now()
        WHERE season_id = $1
          AND team_id = $2
          AND player_id = $3
      `,
      [game.seasonId, teamId, playerId]
    );

    await client.query(
      "DELETE FROM game_events WHERE game_id = $1 AND player_id = $2",
      [gameId, playerId]
    );

    await client.query(
      "DELETE FROM game_player_stats WHERE game_id = $1 AND team_id = $2 AND player_id = $3",
      [gameId, teamId, playerId]
    );

    await recalculateTeamScores(client, gameId);

    await client.query("COMMIT");

    const liveGameState = await getLiveGameState(gameId);
    res.json(liveGameState);
    await notifyLiveGameState(gameId, "roster-updated");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

  router.patch("/:gameId/clock", async (req, res, next) => {
  const { gameId } = req.params;

  if (!isUuid(gameId)) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  const body = req.body || {};
  const period = body.period;
  const secondsRemaining =
    body.clockSecondsRemaining ?? body.clock_seconds_remaining;
  const clockStatus = body.clockStatus ?? body.clock_status;
  const errors = [];
  const updates = [];
  const values = [gameId];

  if (period !== undefined) {
    if (!Number.isInteger(period) || ![1, 2].includes(period)) {
      errors.push("period must be 1 or 2");
    } else {
      values.push(period);
      updates.push(`period = $${values.length}`);
    }
  }

  if (secondsRemaining !== undefined) {
    if (
      !Number.isInteger(secondsRemaining) ||
      secondsRemaining < 0 ||
      secondsRemaining > HALF_SECONDS
    ) {
      errors.push("clockSecondsRemaining must be an integer from 0 to 1200");
    } else {
      values.push(secondsRemaining);
      updates.push(`clock_seconds_remaining = $${values.length}`);
    }
  }

  if (clockStatus !== undefined) {
    if (!ALLOWED_CLOCK_STATUSES.includes(clockStatus)) {
      errors.push("clockStatus must be stopped, running, halftime, or final");
    } else {
      values.push(clockStatus);
      updates.push(`clock_status = $${values.length}`);
    }
  }

  if (!updates.length) errors.push("At least one clock field is required");

  if (errors.length) {
    res.status(400).json({ error: "Invalid clock state", details: errors });
    return;
  }

  try {
    const { rows } = await pool.query(
      `
        UPDATE games
        SET ${updates.join(", ")},
            clock_updated_at = now(),
            updated_at = now()
        WHERE id = $1
        RETURNING id
      `,
      values
    );

    if (!rows.length) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    const liveGameState = await getLiveGameState(gameId);

    res.json(liveGameState);
    await notifyLiveGameState(gameId, "clock-updated");
  } catch (err) {
    next(err);
  }
});

  router.patch("/:gameId/score", async (req, res, next) => {
  const { gameId } = req.params;

  if (!isUuid(gameId)) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  const body = req.body || {};
  const homeScore = body.homeScore ?? body.home_score;
  const awayScore = body.awayScore ?? body.away_score;
  const resetPlayerStats = body.resetPlayerStats === true || body.reset_player_stats === true;
  const updates = [];
  const values = [gameId];
  const errors = [];

  if (homeScore === undefined && awayScore === undefined) {
    errors.push("At least one score field is required");
  }

  if (homeScore !== undefined) {
    if (!Number.isInteger(homeScore) || homeScore < 0) {
      errors.push("homeScore must be a nonnegative integer");
    } else {
      values.push(homeScore);
      updates.push(`home_score = $${values.length}`);
    }
  }

  if (awayScore !== undefined) {
    if (!Number.isInteger(awayScore) || awayScore < 0) {
      errors.push("awayScore must be a nonnegative integer");
    } else {
      values.push(awayScore);
      updates.push(`away_score = $${values.length}`);
    }
  }

  if (errors.length) {
    res.status(400).json({ error: "Invalid score", details: errors });
    return;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
        UPDATE games
        SET ${updates.join(", ")},
            updated_at = now()
        WHERE id = $1
        RETURNING id
      `,
      values
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Game not found" });
      return;
    }

    if (resetPlayerStats) {
      await client.query(
        `
          UPDATE game_player_stats
          SET did_play = false,
              points = 0,
              fgm = 0,
              fga = 0,
              two_pm = 0,
              two_pa = 0,
              three_pm = 0,
              three_pa = 0,
              ftm = 0,
              fta = 0,
              rebounds = 0,
              assists = 0,
              turnovers = 0,
              fouls = 0,
              steals_blocks = 0,
              updated_at = now()
          WHERE game_id = $1
        `,
        [gameId]
      );

      await client.query("DELETE FROM game_events WHERE game_id = $1", [gameId]);

      await client.query(
        `
          UPDATE games
          SET home_timeouts_used = 0,
              away_timeouts_used = 0,
              updated_at = now()
          WHERE id = $1
        `,
        [gameId]
      );
    }

    await client.query("COMMIT");

    const liveGameState = await getLiveGameState(gameId);

    if (resetPlayerStats) {
      await clearGameFromWeekJson(liveGameState).catch(() => {});
    }

    res.json(liveGameState);
    await notifyLiveGameState(gameId, "score-updated");
    await resolveBracketAndBroadcast();
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

  router.patch("/:gameId/timeouts", async (req, res, next) => {
    const { gameId } = req.params;

    if (!isUuid(gameId)) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    const body = req.body || {};
    const homeTimeoutsUsed = body.homeTimeoutsUsed ?? body.home_timeouts_used;
    const awayTimeoutsUsed = body.awayTimeoutsUsed ?? body.away_timeouts_used;
    const updates = [];
    const values = [gameId];
    const errors = [];

    if (homeTimeoutsUsed === undefined && awayTimeoutsUsed === undefined) {
      errors.push("At least one timeouts field is required");
    }

    if (homeTimeoutsUsed !== undefined) {
      if (
        !Number.isInteger(homeTimeoutsUsed) ||
        homeTimeoutsUsed < 0 ||
        homeTimeoutsUsed > TIMEOUTS_PER_GAME
      ) {
        errors.push(
          `homeTimeoutsUsed must be an integer from 0 to ${TIMEOUTS_PER_GAME}`
        );
      } else {
        values.push(homeTimeoutsUsed);
        updates.push(`home_timeouts_used = $${values.length}`);
      }
    }

    if (awayTimeoutsUsed !== undefined) {
      if (
        !Number.isInteger(awayTimeoutsUsed) ||
        awayTimeoutsUsed < 0 ||
        awayTimeoutsUsed > TIMEOUTS_PER_GAME
      ) {
        errors.push(
          `awayTimeoutsUsed must be an integer from 0 to ${TIMEOUTS_PER_GAME}`
        );
      } else {
        values.push(awayTimeoutsUsed);
        updates.push(`away_timeouts_used = $${values.length}`);
      }
    }

    if (errors.length) {
      res.status(400).json({ error: "Invalid timeouts", details: errors });
      return;
    }

    try {
      const { rows } = await pool.query(
        `
          UPDATE games
          SET ${updates.join(", ")},
              updated_at = now()
          WHERE id = $1
          RETURNING id
        `,
        values
      );

      if (!rows.length) {
        res.status(404).json({ error: "Game not found" });
        return;
      }

      const liveGameState = await getLiveGameState(gameId);

      res.json(liveGameState);
      await notifyLiveGameState(gameId, "timeouts-updated");
    } catch (err) {
      next(err);
    }
  });

  router.patch("/:gameId/player-stats/:playerId", async (req, res, next) => {
  const { gameId, playerId } = req.params;

  if (!isUuid(gameId) || !isUuid(playerId)) {
    res.status(404).json({ error: "Game or player not found" });
    return;
  }

  const { errors, normalized } = validatePlayerStatsPayload(req.body || {});
  if (errors.length) {
    res.status(400).json({ error: "Invalid player stats", details: errors });
    return;
  }

  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");

    const rosterResult = await client.query(
      `
        SELECT
          g.id AS "gameId",
          tp.team_id AS "teamId"
        FROM games g
        JOIN team_players tp
          ON tp.season_id = g.season_id
          AND tp.player_id = $2
          AND tp.team_id IN (g.home_team_id, g.away_team_id)
          AND (tp.game_id IS NULL OR tp.game_id = g.id)
        WHERE g.id = $1
        LIMIT 1
      `,
      [gameId, playerId]
    );

    if (!rosterResult.rows.length) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Game or player not found" });
      return;
    }

    const teamStatusResult = await client.query(
      `
        SELECT status
        FROM game_team_status
        WHERE game_id = $1
          AND team_id = $2
        LIMIT 1
      `,
      [gameId, rosterResult.rows[0].teamId]
    );

    if (teamStatusResult.rows[0]?.status === "finalized") {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: "Team is finalized. Reopen the team before editing stats.",
      });
      return;
    }

    const existingResult = await client.query(
      `
        SELECT
          did_play AS "didPlay",
          points,
          fgm,
          fga,
          two_pm AS "twoPm",
          two_pa AS "twoPa",
          three_pm AS "threePm",
          three_pa AS "threePa",
          ftm,
          fta,
          rebounds,
          assists,
          turnovers,
          fouls,
          steals_blocks AS "stealsBlocks"
        FROM game_player_stats
        WHERE game_id = $1
          AND player_id = $2
        LIMIT 1
      `,
      [gameId, playerId]
    );

    const nextStats = {
      ...defaultPlayerStats(),
      ...(existingResult.rows[0] || {}),
      ...normalized,
    };
    const beforeStats = normalizeStatsForEvent({
      ...defaultPlayerStats(),
      ...(existingResult.rows[0] || {}),
    });
    const afterStats = normalizeStatsForEvent(nextStats);
    const madeErrors = validateMadeStats(nextStats);

    if (madeErrors.length) {
      await client.query("ROLLBACK");
      res.status(400).json({
        error: "Invalid player stats",
        details: madeErrors,
      });
      return;
    }

    const upsertResult = await upsertPlayerStats(
      client,
      gameId,
      rosterResult.rows[0].teamId,
      playerId,
      nextStats
    );

    await recalculateTeamScores(client, gameId);

    if (didStatsChange(beforeStats, afterStats)) {
      await client.query(
        `
          INSERT INTO game_events (
            game_id,
            team_id,
            player_id,
            admin_username,
            event_type,
            before_stats,
            after_stats
          )
          VALUES ($1, $2, $3, $4, 'player_stats_updated', $5::jsonb, $6::jsonb)
        `,
        [
          gameId,
          rosterResult.rows[0].teamId,
          playerId,
          req.admin?.sub || "admin",
          JSON.stringify(beforeStats),
          JSON.stringify(afterStats),
        ]
      );
    }

    await client.query("COMMIT");
    committed = true;

    const game = await getGame(gameId);

    res.json({
      game,
      playerStats: upsertResult.rows[0],
    });

    await notifyLiveGameState(gameId, "stats-updated");
  } catch (err) {
    if (!committed) await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

  router.post("/:gameId/events/:eventId/undo", async (req, res, next) => {
  const { gameId, eventId } = req.params;

  if (!isUuid(gameId) || !isUuid(eventId)) {
    res.status(404).json({ error: "Game event not found" });
    return;
  }

  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");

    const eventResult = await client.query(
      `
        SELECT
          id,
          game_id AS "gameId",
          team_id AS "teamId",
          player_id AS "playerId",
          event_type AS "eventType",
          before_stats AS "beforeStats",
          after_stats AS "afterStats"
        FROM game_events
        WHERE id = $1
          AND game_id = $2
        LIMIT 1
      `,
      [eventId, gameId]
    );

    const event = eventResult.rows[0];

    if (!event || event.eventType !== "player_stats_updated") {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Undoable stat edit not found" });
      return;
    }

    const teamStatusResult = await client.query(
      `
        SELECT status
        FROM game_team_status
        WHERE game_id = $1
          AND team_id = $2
        LIMIT 1
      `,
      [gameId, event.teamId]
    );

    if (teamStatusResult.rows[0]?.status === "finalized") {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: "Team is finalized. Reopen the team before undoing stats.",
      });
      return;
    }

    const restoredStats = normalizeStatsForEvent({
      ...defaultPlayerStats(),
      ...(event.beforeStats || {}),
    });
    const madeErrors = validateMadeStats(restoredStats);

    if (madeErrors.length) {
      await client.query("ROLLBACK");
      res.status(400).json({
        error: "Invalid undo stats",
        details: madeErrors,
      });
      return;
    }

    await upsertPlayerStats(
      client,
      gameId,
      event.teamId,
      event.playerId,
      restoredStats
    );
    await recalculateTeamScores(client, gameId);

    await client.query(
      "DELETE FROM game_events WHERE id = $1 AND game_id = $2",
      [eventId, gameId]
    );

    await client.query("COMMIT");
    committed = true;

    const liveGameState = await getLiveGameState(gameId);

    res.json(liveGameState);
    await notifyLiveGameState(gameId, "stats-updated");
  } catch (err) {
    if (!committed) await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

  router.post("/:gameId/teams/:teamId/finalize", async (req, res, next) => {
  const { gameId, teamId } = req.params;

  if (!isUuid(gameId) || !isUuid(teamId)) {
    res.status(404).json({ error: "Game or team not found" });
    return;
  }

  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");

    const result = await finalizeTeam(
      client,
      gameId,
      teamId,
      req.admin?.sub || "admin"
    );

    if (!result) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Game or team not found" });
      return;
    }

    await client.query("COMMIT");
    committed = true;

    const liveGameState = await getLiveGameState(gameId);

    res.json({
      ...liveGameState,
      finalizedTeamId: teamId,
      isGameFinal: result.isGameFinal,
    });

    await notifyLiveGameState(
      gameId,
      result.isGameFinal ? "finalized" : "team-finalized"
    );
    if (result.isGameFinal) await resolveBracketAndBroadcast();
  } catch (err) {
    if (!committed) await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

  router.post("/:gameId/teams/:teamId/submit-to-publish", async (req, res, next) => {
  const { gameId, teamId } = req.params;

  if (!isUuid(gameId) || !isUuid(teamId)) {
    res.status(404).json({ error: "Game or team not found" });
    return;
  }

  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");

    const result = await finalizeTeam(
      client,
      gameId,
      teamId,
      req.admin?.sub || "admin"
    );

    if (!result) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Game or team not found" });
      return;
    }

    await client.query("COMMIT");
    committed = true;

    const liveGameState = await getLiveGameState(gameId);
    const publishedFile = await publishGameToWeekJson(liveGameState);

    res.json({
      ...liveGameState,
      finalizedTeamId: teamId,
      isGameFinal: result.isGameFinal,
      published: {
        weekNumber: liveGameState.game.weekNumber,
        gameNumber: liveGameState.game.gameNumber,
        file: path.relative(PUBLIC_SEASONS_DIR, publishedFile),
      },
    });

    await notifyLiveGameState(
      gameId,
      result.isGameFinal ? "finalized" : "team-finalized"
    );
    if (result.isGameFinal) await resolveBracketAndBroadcast();
  } catch (err) {
    if (!committed) await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

  router.post("/:gameId/teams/:teamId/reopen", async (req, res, next) => {
  const { gameId, teamId } = req.params;

  if (req.admin?.role !== "admin") {
    res.status(403).json({ error: "Admin role required" });
    return;
  }

  if (!isUuid(gameId) || !isUuid(teamId)) {
    res.status(404).json({ error: "Game or team not found" });
    return;
  }

  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");

    const result = await reopenTeam(client, gameId, teamId);

    if (!result) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Game or team not found" });
      return;
    }

    await client.query("COMMIT");
    committed = true;

    const liveGameState = await getLiveGameState(gameId);

    res.json({
      ...liveGameState,
      reopenedTeamId: result.reopenedTeamId,
    });

    await notifyLiveGameState(gameId, "team-reopened");
  } catch (err) {
    if (!committed) await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

  router.patch("/:gameId/youtube-url", async (req, res, next) => {
  const { gameId } = req.params;

  if (!isUuid(gameId)) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  const rawUrl = req.body?.youtubeUrl ?? null;

  if (rawUrl !== null && typeof rawUrl !== "string") {
    res.status(400).json({ error: "youtubeUrl must be a string or null" });
    return;
  }

  const youtubeUrl = rawUrl ? String(rawUrl).trim() || null : null;

  try {
    const { rows } = await pool.query(
      `UPDATE games SET youtube_url = $2, updated_at = now() WHERE id = $1 RETURNING id`,
      [gameId, youtubeUrl]
    );

    if (!rows.length) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    const game = await getGame(rows[0].id);
    res.json({ game });
    await notifyLiveGameState(gameId, "youtube-url-updated");
  } catch (err) {
    next(err);
  }
});

  router.post("/:gameId/finalize", async (req, res, next) => {
  const { gameId } = req.params;

  if (!isUuid(gameId)) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");

    const gameResult = await client.query(
      `
        SELECT id
        FROM games
        WHERE id = $1
        LIMIT 1
      `,
      [gameId]
    );

    if (!gameResult.rows.length) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Game not found" });
      return;
    }

    await recalculateTeamScores(client, gameId);
    const gameTeams = await getGameTeamIds(client, gameId);

    if (gameTeams) {
      await client.query(
        `
          INSERT INTO game_team_status (
            game_id,
            team_id,
            status,
            finalized_at,
            finalized_by
          )
          VALUES
            ($1, $2, 'finalized', now(), $4),
            ($1, $3, 'finalized', now(), $4)
          ON CONFLICT (game_id, team_id)
          DO UPDATE SET
            status = 'finalized',
            finalized_at = COALESCE(game_team_status.finalized_at, EXCLUDED.finalized_at),
            finalized_by = EXCLUDED.finalized_by,
            updated_at = now()
        `,
        [
          gameId,
          gameTeams.homeTeamId,
          gameTeams.awayTeamId,
          req.admin?.sub || "admin",
        ]
      );
    }

    await client.query(
      `
        UPDATE games
        SET status = 'final',
            clock_status = 'final',
            clock_seconds_remaining = 0,
            clock_updated_at = now(),
            updated_at = now()
        WHERE id = $1
      `,
      [gameId]
    );
    await client.query("COMMIT");
    committed = true;

    const game = await getGame(gameId);

    res.json({ game });
    await notifyLiveGameState(gameId, "finalized");
    await resolveBracketAndBroadcast();
  } catch (err) {
    if (!committed) await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

  return router;
}

module.exports = { createGamesRouter, getLiveGameState };
