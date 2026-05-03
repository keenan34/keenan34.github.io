const { Router } = require("express");
const { pool } = require("../../db/pool");

const router = Router();

router.get("/:seasonSlug/teams", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          t.id AS "teamId",
          t.name AS "teamName",
          t.slug AS "teamSlug",
          t.display_order AS "displayOrder",
          COALESCE(
            json_agg(
              json_build_object(
                'playerId', p.id,
                'name', p.name,
                'slug', p.slug,
                'number', tp.jersey_number,
                'imgUrl', p.image_url,
                'status', tp.roster_status
              )
              ORDER BY NULLIF(regexp_replace(tp.jersey_number, '[^0-9]', '', 'g'), '')::int NULLS LAST, p.name
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'::json
          ) AS roster
        FROM seasons s
        JOIN teams t ON t.season_id = s.id
        LEFT JOIN team_players tp
          ON tp.team_id = t.id
          AND tp.season_id = s.id
        LEFT JOIN players p ON p.id = tp.player_id
          AND p.is_temp = false
        WHERE s.slug = $1
        GROUP BY t.id, t.name, t.slug, t.display_order
        ORDER BY t.display_order NULLS LAST, t.name
      `,
      [req.params.seasonSlug]
    );

    res.json({
      season: req.params.seasonSlug,
      teams: rows.map((row) => ({
        id: row.teamId,
        name: row.teamName,
        slug: row.teamSlug,
        displayOrder: row.displayOrder,
        roster: row.roster,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
