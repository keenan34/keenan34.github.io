const { Router } = require("express");
const { pool } = require("../../db/pool");

const router = Router();
const PLAYER_NAME_ALIASES = {
  "musab bawaney": "Musab Bawany",
};

function normalizePlayerName(name) {
  const raw = String(name || "").trim();
  return PLAYER_NAME_ALIASES[raw.toLowerCase()] || raw;
}

function legacyGameRow(row) {
  const hasPublicScore = row.status === "live" || row.status === "final" || row.status === "finished";

  return {
    id: row.id,
    season: row.seasonSlug,
    weekNumber: row.weekNumber,
    gameNumber: row.gameNumber,
    gameId: row.publicGameId,
    publicGameId: row.publicGameId,
    scheduledAt: row.scheduledAt,
    date: row.date,
    time: row.time,
    teamA: row.teamA,
    teamB: row.teamB,
    teamAId: row.teamAId,
    teamBId: row.teamBId,
    scoreA: hasPublicScore ? row.scoreA : null,
    scoreB: hasPublicScore ? row.scoreB : null,
    status: row.status,
    youtubeUrl: row.youtubeUrl,
  };
}

router.get("/seasons/:seasonSlug/games", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          g.id,
          s.slug AS "seasonSlug",
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
          home.id AS "teamAId",
          home.name AS "teamA",
          away.id AS "teamBId",
          away.name AS "teamB",
          g.home_score AS "scoreA",
          g.away_score AS "scoreB",
          g.status,
          g.youtube_url AS "youtubeUrl"
        FROM games g
        JOIN seasons s ON s.id = g.season_id
        JOIN teams home ON home.id = g.home_team_id
        JOIN teams away ON away.id = g.away_team_id
        WHERE s.slug = $1
        ORDER BY g.week_number, g.game_number
      `,
      [req.params.seasonSlug]
    );

    res.json({
      season: req.params.seasonSlug,
      games: rows.map(legacyGameRow),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/games/:publicGameId", async (req, res, next) => {
  try {
    const seasonSlug = req.query.season ? String(req.query.season) : null;
    const { rows } = await pool.query(
      `
        SELECT
          g.id,
          s.slug AS "seasonSlug",
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
          home.id AS "teamAId",
          home.name AS "teamA",
          away.id AS "teamBId",
          away.name AS "teamB",
          g.home_score AS "scoreA",
          g.away_score AS "scoreB",
          g.status,
          g.youtube_url AS "youtubeUrl"
        FROM games g
        JOIN seasons s ON s.id = g.season_id
        JOIN teams home ON home.id = g.home_team_id
        JOIN teams away ON away.id = g.away_team_id
        WHERE g.public_game_id = $1
          AND ($2::text IS NULL OR s.slug = $2)
        ORDER BY s.is_current DESC, s.starts_on DESC NULLS LAST, s.slug DESC
        LIMIT 1
      `,
      [req.params.publicGameId, seasonSlug]
    );

    if (!rows.length) {
      res.status(404).json({ error: "Game not found" });
      return;
    }

    const game = legacyGameRow(rows[0]);
    const [statsResult, rosterResult] = await Promise.all([
      pool.query(
      `
        SELECT
          t.id AS "teamId",
          t.name AS "teamName",
          p.id AS "playerId",
          p.name AS "playerName",
          p.slug AS "playerSlug",
          p.image_url AS "imgUrl",
          gps.did_play AS "didPlay",
          gps.points,
          gps.fgm,
          gps.fga,
          gps.two_pm AS "twoPm",
          gps.two_pa AS "twoPa",
          gps.three_pm AS "threePm",
          gps.three_pa AS "threePa",
          gps.ftm,
          gps.fta,
          gps.rebounds,
          gps.assists,
          gps.turnovers,
          gps.fouls,
          gps.steals_blocks AS "stealsBlocks"
        FROM game_player_stats gps
        JOIN teams t ON t.id = gps.team_id
        JOIN players p ON p.id = gps.player_id
        WHERE gps.game_id = $1
        ORDER BY t.name, p.name
      `,
        [game.id]
      ),
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
        [game.id]
      ),
    ]);

    const rosterByTeamId = new Map([
      [game.teamAId, { team: { id: game.teamAId, name: game.teamA }, players: [] }],
      [game.teamBId, { team: { id: game.teamBId, name: game.teamB }, players: [] }],
    ]);

    rosterResult.rows.forEach((row) => {
      const roster = rosterByTeamId.get(row.teamId);
      if (!roster) return;
      roster.team.slug = row.teamSlug;
      row.playerName = normalizePlayerName(row.playerName);
      roster.players.push(row);
    });

    res.json({
      game,
      rosters: Array.from(rosterByTeamId.values()),
      playerStats: statsResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/seasons/:seasonSlug/weeks/:weekNumber/player-stats", async (req, res, next) => {
  try {
    const { seasonSlug, weekNumber } = req.params;
    const weekNum = parseInt(weekNumber, 10);
    if (!Number.isFinite(weekNum)) {
      return res.status(400).json({ error: "Invalid week number" });
    }

    const { rows } = await pool.query(
      `
        SELECT
          g.game_number       AS "gameNumber",
          home.id             AS "homeTeamId",
          home.name           AS "homeTeamName",
          away.id             AS "awayTeamId",
          away.name           AS "awayTeamName",
          t.id                AS "teamId",
          p.name              AS "playerName",
          gps.did_play        AS "didPlay",
          gps.points,
          gps.fgm,
          gps.fga,
          gps.two_pm          AS "twoPm",
          gps.two_pa          AS "twoPa",
          gps.three_pm        AS "threePm",
          gps.three_pa        AS "threePa",
          gps.ftm,
          gps.fta,
          gps.rebounds,
          gps.assists,
          gps.turnovers,
          gps.fouls,
          gps.steals_blocks   AS "stealsBlocks"
        FROM games g
        JOIN seasons s         ON s.id = g.season_id
        JOIN teams home        ON home.id = g.home_team_id
        JOIN teams away        ON away.id = g.away_team_id
        JOIN game_player_stats gps ON gps.game_id = g.id
        JOIN teams t           ON t.id = gps.team_id
        JOIN players p         ON p.id = gps.player_id
        WHERE s.slug = $1
          AND g.week_number = $2
        ORDER BY g.game_number, t.id, p.name
      `,
      [seasonSlug, weekNum]
    );

    const games = {};
    rows.forEach((row) => {
      const key = `game${row.gameNumber}`;
      if (!games[key]) {
        games[key] = {
          teamA: { name: row.homeTeamName, players: [] },
          teamB: { name: row.awayTeamName, players: [] },
        };
      }
      const side = row.teamId === row.homeTeamId ? "teamA" : "teamB";
      const played = row.didPlay;
      games[key][side].players.push({
        Player:       normalizePlayerName(row.playerName),
        Points:       played ? row.points       : null,
        FGM:          played ? row.fgm          : null,
        FGA:          played ? row.fga          : null,
        "2 PTM":      played ? row.twoPm        : null,
        "2 PTA":      played ? row.twoPa        : null,
        "3 PTM":      played ? row.threePm      : null,
        "3 PTA":      played ? row.threePa      : null,
        FTM:          played ? row.ftm          : null,
        FTA:          played ? row.fta          : null,
        REB:          played ? row.rebounds     : null,
        AST:          played ? row.assists      : null,
        TOs:          played ? row.turnovers    : null,
        Fouls:        played ? row.fouls        : null,
        "STLS/BLKS":  played ? row.stealsBlocks : null,
      });
    });

    res.json(games);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
