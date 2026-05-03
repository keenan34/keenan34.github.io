const { Router } = require("express");
const { pool } = require("../../db/pool");

const router = Router();

router.get("/:seasonSlug/players", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          p.id,
          p.name,
          p.slug,
          p.image_url AS "imgUrl",
          tp.jersey_number AS "number",
          tp.roster_status AS "status",
          t.id AS "teamId",
          t.name AS "teamName",
          t.slug AS "teamSlug"
        FROM seasons s
        JOIN team_players tp ON tp.season_id = s.id
        JOIN players p ON p.id = tp.player_id
        JOIN teams t ON t.id = tp.team_id
        WHERE s.slug = $1
          AND p.is_temp = false
        ORDER BY p.name, t.name
      `,
      [req.params.seasonSlug]
    );

    res.json({
      season: req.params.seasonSlug,
      players: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        imgUrl: row.imgUrl,
        number: row.number,
        status: row.status,
        team: {
          id: row.teamId,
          name: row.teamName,
          slug: row.teamSlug,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
