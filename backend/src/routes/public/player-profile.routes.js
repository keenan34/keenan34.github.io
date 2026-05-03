const { Router } = require("express");
const { pool } = require("../../db/pool");

const router = Router();

function avg(total, games) {
  return games ? Number((total / games).toFixed(1)) : 0;
}

function pct(made, attempted) {
  return attempted ? Number(((made / attempted) * 100).toFixed(1)) : 0;
}

function toStats(row) {
  if (!row.didPlay) {
    return {
      points: null,
      rebounds: null,
      assists: null,
      fgm: null,
      fga: null,
      fgPct: null,
      twoPtM: null,
      twoPtA: null,
      twoPtPct: null,
      threePtM: null,
      threePtA: null,
      threePtPct: null,
      ftm: null,
      fta: null,
      ftPct: null,
      tos: null,
      steals: null,
      fouls: null,
    };
  }

  return {
    points: row.points,
    rebounds: row.rebounds,
    assists: row.assists,
    fgm: row.fgm,
    fga: row.fga,
    fgPct: pct(row.fgm, row.fga),
    twoPtM: row.twoPm,
    twoPtA: row.twoPa,
    twoPtPct: pct(row.twoPm, row.twoPa),
    threePtM: row.threePm,
    threePtA: row.threePa,
    threePtPct: pct(row.threePm, row.threePa),
    ftm: row.ftm,
    fta: row.fta,
    ftPct: pct(row.ftm, row.fta),
    tos: row.turnovers,
    steals: row.stealsBlocks,
    fouls: row.fouls,
  };
}

function toAverages(rows) {
  const byPlayer = new Map();

  rows.forEach((row) => {
    if (!row.didPlay) return;

    const current = byPlayer.get(row.playerName) || {
      name: row.playerName,
      games: 0,
      totals: {
        points: 0,
        rebounds: 0,
        assists: 0,
        fgm: 0,
        fga: 0,
        twoPtM: 0,
        twoPtA: 0,
        threePtM: 0,
        threePtA: 0,
        ftm: 0,
        fta: 0,
        tos: 0,
        steals: 0,
        fouls: 0,
      },
    };

    current.games += 1;
    current.totals.points += row.points;
    current.totals.rebounds += row.rebounds;
    current.totals.assists += row.assists;
    current.totals.fgm += row.fgm;
    current.totals.fga += row.fga;
    current.totals.twoPtM += row.twoPm;
    current.totals.twoPtA += row.twoPa;
    current.totals.threePtM += row.threePm;
    current.totals.threePtA += row.threePa;
    current.totals.ftm += row.ftm;
    current.totals.fta += row.fta;
    current.totals.tos += row.turnovers;
    current.totals.steals += row.stealsBlocks;
    current.totals.fouls += row.fouls;

    byPlayer.set(row.playerName, current);
  });

  return [...byPlayer.values()].map((row) => ({
    name: row.name,
    avg: {
      points: avg(row.totals.points, row.games),
      rebounds: avg(row.totals.rebounds, row.games),
      assists: avg(row.totals.assists, row.games),
      fgm: avg(row.totals.fgm, row.games),
      fga: avg(row.totals.fga, row.games),
      fgPct: pct(row.totals.fgm, row.totals.fga),
      twoPtM: avg(row.totals.twoPtM, row.games),
      twoPtA: avg(row.totals.twoPtA, row.games),
      twoPtPct: pct(row.totals.twoPtM, row.totals.twoPtA),
      threePtM: avg(row.totals.threePtM, row.games),
      threePtA: avg(row.totals.threePtA, row.games),
      threePtPct: pct(row.totals.threePtM, row.totals.threePtA),
      ftm: avg(row.totals.ftm, row.games),
      fta: avg(row.totals.fta, row.games),
      ftPct: pct(row.totals.ftm, row.totals.fta),
      tos: avg(row.totals.tos, row.games),
      steals: avg(row.totals.steals, row.games),
      fouls: avg(row.totals.fouls, row.games),
    },
  }));
}

router.get("/:playerSlug", async (req, res, next) => {
  try {
    const playerResult = await pool.query(
      `
        SELECT id, name, slug, image_url AS "imgUrl"
        FROM players
        WHERE (slug = $1 OR ($1 = 'dujuan_wright' AND name = 'Jerremiah Dujuan Wright'))
          AND is_temp = false
      `,
      [req.params.playerSlug]
    );

    if (!playerResult.rows.length) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const player = playerResult.rows[0];

    const rosterResult = await pool.query(
      `
        SELECT
          s.slug AS "seasonSlug",
          t.id AS "teamId",
          t.name AS "teamName",
          t.slug AS "teamSlug",
          tp.jersey_number AS "number"
        FROM team_players tp
        JOIN seasons s ON s.id = tp.season_id
        JOIN teams t ON t.id = tp.team_id
        WHERE tp.player_id = $1
        ORDER BY s.starts_on DESC NULLS LAST, s.slug DESC
      `,
      [player.id]
    );

    const statsResult = await pool.query(
      `
        SELECT
          s.slug AS "seasonSlug",
          g.week_number AS "weekNumber",
          g.game_number AS "gameNumber",
          g.public_game_id AS "gameId",
          home.name AS "teamA",
          away.name AS "teamB",
          g.home_score AS "scoreA",
          g.away_score AS "scoreB",
          t.id AS "teamId",
          t.name AS "teamName",
          opponent.name AS "opponent",
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
        JOIN games g ON g.id = gps.game_id
        JOIN seasons s ON s.id = g.season_id
        JOIN teams t ON t.id = gps.team_id
        JOIN teams home ON home.id = g.home_team_id
        JOIN teams away ON away.id = g.away_team_id
        JOIN teams opponent ON opponent.id = CASE
          WHEN gps.team_id = g.home_team_id THEN g.away_team_id
          ELSE g.home_team_id
        END
        WHERE gps.player_id = $1
        ORDER BY s.starts_on DESC NULLS LAST, s.slug DESC, g.week_number, g.game_number
      `,
      [player.id]
    );

    const leagueStatsResult = await pool.query(
      `
        SELECT
          s.slug AS "seasonSlug",
          p.name AS "playerName",
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
        JOIN games g ON g.id = gps.game_id
        JOIN seasons s ON s.id = g.season_id
        JOIN players p ON p.id = gps.player_id
        WHERE p.is_temp = false
      `
    );

    const seasons = new Map();

    rosterResult.rows.forEach((row) => {
      seasons.set(row.seasonSlug, {
        season: row.seasonSlug,
        team: {
          id: row.teamId,
          name: row.teamName,
          slug: row.teamSlug,
        },
        number: row.number,
        games: [],
        leagueAverages: [],
      });
    });

    statsResult.rows.forEach((row) => {
      if (!seasons.has(row.seasonSlug)) {
        seasons.set(row.seasonSlug, {
          season: row.seasonSlug,
          team: {
            id: row.teamId,
            name: row.teamName,
            slug: null,
          },
          number: null,
          games: [],
          leagueAverages: [],
        });
      }

      seasons.get(row.seasonSlug).games.push({
        week: `Week ${row.weekNumber}`,
        weekNumber: row.weekNumber,
        gameNumber: row.gameNumber,
        gameId: row.gameId,
        opponent: row.opponent,
        teamA: row.teamA,
        teamB: row.teamB,
        scoreA: row.scoreA,
        scoreB: row.scoreB,
        didPlay: row.didPlay,
        ...toStats(row),
      });
    });

    const leagueStatsBySeason = new Map();
    leagueStatsResult.rows.forEach((row) => {
      if (!leagueStatsBySeason.has(row.seasonSlug)) {
        leagueStatsBySeason.set(row.seasonSlug, []);
      }
      leagueStatsBySeason.get(row.seasonSlug).push(row);
    });

    seasons.forEach((season) => {
      season.leagueAverages = toAverages(
        leagueStatsBySeason.get(season.season) || []
      );
    });

    res.json({
      player: {
        ...player,
        imageUrl: player.imgUrl,
        image_url: player.imgUrl,
      },
      seasons: [...seasons.values()],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
