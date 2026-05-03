const { Router } = require("express");
const { pool } = require("../../db/pool");

const router = Router();

function average(total, games) {
  return games ? Number((total / games).toFixed(1)) : 0;
}

router.get("/:seasonSlug", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          p.id AS "playerId",
          p.name,
          p.slug,
          p.image_url,
          COUNT(*)::int AS games,
          COALESCE(SUM(gps.points), 0)::int AS "totalPts",
          COALESCE(SUM(gps.assists), 0)::int AS "totalAst",
          COALESCE(SUM(gps.three_pm), 0)::int AS "total3",
          COALESCE(SUM(gps.rebounds), 0)::int AS "totalReb",
          COALESCE(SUM(gps.turnovers), 0)::int AS "totalTO",
          COALESCE(SUM(gps.fouls), 0)::int AS "totalFouls",
          COALESCE(SUM(gps.steals_blocks), 0)::int AS "totalStlBlk"
        FROM seasons s
        JOIN games g ON g.season_id = s.id
        JOIN game_player_stats gps ON gps.game_id = g.id
        JOIN players p ON p.id = gps.player_id
        WHERE s.slug = $1
          AND gps.did_play = true
          AND p.is_temp = false
        GROUP BY p.id, p.name, p.slug, p.image_url
        ORDER BY "totalPts" DESC, p.name
      `,
      [req.params.seasonSlug]
    );

    res.json({
      season: req.params.seasonSlug,
      leaders: rows.map((row) => ({
        ...row,
        imageUrl: row.image_url,
        imgUrl: row.image_url,
        avgPts: average(row.totalPts, row.games),
        avgAst: average(row.totalAst, row.games),
        avg3: average(row.total3, row.games),
        avgReb: average(row.totalReb, row.games),
        avgTO: average(row.totalTO, row.games),
        avgFouls: average(row.totalFouls, row.games),
        avgStlBlk: average(row.totalStlBlk, row.games),
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
