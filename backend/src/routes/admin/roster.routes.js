const { Router } = require("express");
const { pool } = require("../../db/pool");

const router = Router();

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// GET /api/admin/roster/:seasonSlug
router.get("/:seasonSlug", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT
          t.id AS "teamId",
          t.name AS "teamName",
          t.slug AS "teamSlug",
          p.id AS "playerId",
          p.name AS "playerName",
          p.slug AS "playerSlug",
          p.image_url AS "imageUrl",
          tp.jersey_number AS "number",
          tp.roster_status AS "status"
        FROM seasons s
        JOIN teams t ON t.season_id = s.id
        LEFT JOIN team_players tp ON tp.team_id = t.id AND tp.season_id = s.id
        LEFT JOIN players p ON p.id = tp.player_id AND p.is_temp = false
        WHERE s.slug = $1
        ORDER BY t.name, NULLIF(regexp_replace(tp.jersey_number, '[^0-9]', '', 'g'), '')::int NULLS LAST, p.name
      `,
      [req.params.seasonSlug]
    );

    const teamsMap = new Map();
    for (const row of rows) {
      if (!teamsMap.has(row.teamId)) {
        teamsMap.set(row.teamId, {
          id: row.teamId,
          name: row.teamName,
          slug: row.teamSlug,
          players: [],
        });
      }
      if (row.playerId) {
        teamsMap.get(row.teamId).players.push({
          id: row.playerId,
          name: row.playerName,
          slug: row.playerSlug,
          imageUrl: row.imageUrl,
          number: row.number,
          status: row.status,
        });
      }
    }

    res.json({ season: req.params.seasonSlug, teams: [...teamsMap.values()] });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/roster/:seasonSlug/teams/:teamId/players
router.post("/:seasonSlug/teams/:teamId/players", async (req, res, next) => {
  const { name, number } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Player name is required" });
  }

  const playerName = String(name).trim();
  const playerSlug = slugify(playerName);
  const jerseyNumber = number != null ? String(number).trim() || null : null;

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Upsert the player
      const playerResult = await client.query(
        `
          INSERT INTO players (name, slug)
          VALUES ($1, $2)
          ON CONFLICT (slug)
          DO UPDATE SET name = EXCLUDED.name, updated_at = now()
          RETURNING id
        `,
        [playerName, playerSlug]
      );
      const playerId = playerResult.rows[0].id;

      // Get the season ID
      const seasonResult = await client.query(
        `SELECT id FROM seasons WHERE slug = $1`,
        [req.params.seasonSlug]
      );
      if (!seasonResult.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Season not found" });
      }
      const seasonId = seasonResult.rows[0].id;

      // Verify the team belongs to this season
      const teamResult = await client.query(
        `SELECT id FROM teams WHERE id = $1 AND season_id = $2`,
        [req.params.teamId, seasonId]
      );
      if (!teamResult.rows.length) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Team not found" });
      }

      // Link player to team
      await client.query(
        `
          INSERT INTO team_players (season_id, team_id, player_id, jersey_number, roster_status)
          VALUES ($1, $2, $3, $4, 'active')
          ON CONFLICT (season_id, team_id, player_id)
          DO UPDATE SET jersey_number = EXCLUDED.jersey_number, roster_status = 'active', updated_at = now()
        `,
        [seasonId, req.params.teamId, playerId, jerseyNumber]
      );

      await client.query("COMMIT");

      res.json({ player: { id: playerId, name: playerName, slug: playerSlug, number: jerseyNumber } });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/roster/:seasonSlug/teams/:teamId/players/:playerId
router.patch("/:seasonSlug/teams/:teamId/players/:playerId", async (req, res, next) => {
  const { number } = req.body;
  const jerseyNumber = number != null ? String(number).trim() || null : null;

  try {
    const { rowCount } = await pool.query(
      `
        UPDATE team_players tp
        SET jersey_number = $1, updated_at = now()
        FROM seasons s
        WHERE tp.season_id = s.id
          AND s.slug = $2
          AND tp.team_id = $3
          AND tp.player_id = $4
      `,
      [jerseyNumber, req.params.seasonSlug, req.params.teamId, req.params.playerId]
    );

    if (!rowCount) return res.status(404).json({ error: "Player not found on this team" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/roster/:seasonSlug/teams/:teamId/players/:playerId
router.delete("/:seasonSlug/teams/:teamId/players/:playerId", async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `
        DELETE FROM team_players tp
        USING seasons s
        WHERE tp.season_id = s.id
          AND s.slug = $1
          AND tp.team_id = $2
          AND tp.player_id = $3
      `,
      [req.params.seasonSlug, req.params.teamId, req.params.playerId]
    );

    if (!rowCount) return res.status(404).json({ error: "Player not found on this team" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
