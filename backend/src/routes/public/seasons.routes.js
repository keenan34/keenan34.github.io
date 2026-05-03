const { Router } = require("express");
const { pool } = require("../../db/pool");

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          id,
          slug,
          name,
          year_label AS "yearLabel",
          starts_on AS "startsOn",
          ends_on AS "endsOn",
          is_current AS "isCurrent",
          status
        FROM seasons
        ORDER BY is_current DESC, starts_on DESC NULLS LAST, slug DESC
      `
    );

    res.json({ seasons: rows });
  } catch (err) {
    next(err);
  }
});

router.get("/:seasonSlug", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          id,
          slug,
          name,
          year_label AS "yearLabel",
          starts_on AS "startsOn",
          ends_on AS "endsOn",
          is_current AS "isCurrent",
          status
        FROM seasons
        WHERE slug = $1
      `,
      [req.params.seasonSlug]
    );

    if (!rows.length) {
      res.status(404).json({ error: "Season not found" });
      return;
    }

    res.json({ season: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
