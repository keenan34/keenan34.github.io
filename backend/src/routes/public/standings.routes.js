const { Router } = require("express");
const { pool } = require("../../db/pool");

const router = Router();

router.get("/:seasonSlug", async (req, res, next) => {
  try {
    const teamsResult = await pool.query(
      `
        SELECT t.id, t.name, t.slug
        FROM seasons s
        JOIN teams t ON t.season_id = s.id
        WHERE s.slug = $1
          AND t.is_placeholder = false
        ORDER BY t.name
      `,
      [req.params.seasonSlug]
    );

    const gamesResult = await pool.query(
      `
        SELECT
          g.home_team_id AS "teamAId",
          g.away_team_id AS "teamBId",
          g.home_score AS "scoreA",
          g.away_score AS "scoreB"
        FROM seasons s
        JOIN games g ON g.season_id = s.id
        WHERE s.slug = $1
          AND g.status = 'final'
          AND g.home_score IS NOT NULL
          AND g.away_score IS NOT NULL
      `,
      [req.params.seasonSlug]
    );

    const records = new Map(
      teamsResult.rows.map((team) => [
        team.id,
        {
          id: team.id,
          team: team.name,
          name: team.name,
          slug: team.slug,
          wins: 0,
          losses: 0,
          played: 0,
          winPct: 0,
          pointsFor: 0,
          pointsAgainst: 0,
        },
      ])
    );

    gamesResult.rows.forEach((game) => {
      const teamA = records.get(game.teamAId);
      const teamB = records.get(game.teamBId);
      if (!teamA || !teamB || game.scoreA === game.scoreB) return;

      teamA.played += 1;
      teamB.played += 1;

      teamA.pointsFor += game.scoreA;
      teamA.pointsAgainst += game.scoreB;
      teamB.pointsFor += game.scoreB;
      teamB.pointsAgainst += game.scoreA;

      if (game.scoreA > game.scoreB) {
        teamA.wins += 1;
        teamB.losses += 1;
      } else {
        teamB.wins += 1;
        teamA.losses += 1;
      }
    });

    const standings = [...records.values()]
      .map((row) => ({
        ...row,
        winPct: row.played ? Number((row.wins / row.played).toFixed(3)) : 0,
        pointDiff: row.pointsFor - row.pointsAgainst,
      }))
      .sort(
        (a, b) =>
          b.winPct - a.winPct ||
          b.wins - a.wins ||
          b.pointDiff - a.pointDiff ||
          a.team.localeCompare(b.team)
      );

    res.json({
      season: req.params.seasonSlug,
      standings,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
